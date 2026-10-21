import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import * as schema from '../db/schema';
import { eq, and, ne, inArray, desc, isNull, lt, sql } from 'drizzle-orm';
import { Resend } from 'resend';
import { calculateSubtotal, calculateTotal, calculateLineItemAmount, addAmounts, isFullyPaid } from '../lib/calculations';
import { canTransitionInvoice, InvoiceStatus } from '../lib/statusMachine';
import { generateUploadUrl } from '../lib/storage';

const invoicesRoutes = new Hono<{ Bindings: { DATABASE_URL: string, RESEND_API_KEY: string }, Variables: { user: any, db: any } }>();

invoicesRoutes.use('*', requireAuth);

export async function generateInvoiceNumber(tx: any, tenantId: number) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  const [latest] = await tx.select({ invoiceNumber: schema.invoices.invoiceNumber })
    .from(schema.invoices)
    .where(eq(schema.invoices.tenantId, tenantId))
    .orderBy(desc(schema.invoices.id))
    .limit(1);

  let sequence = 1;
  if (latest && latest.invoiceNumber.startsWith(prefix)) {
    const lastSeq = parseInt(latest.invoiceNumber.split('-')[2], 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }
  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

invoicesRoutes.get('/', requireAdmin, async (c) => {
  const user = c.get('user');
  const clientId = c.req.query('client_id');
  const search = c.req.query('search');
  const status = c.req.query('status');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const db = c.get('db');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    await db.update(schema.invoices)
      .set({ status: 'overdue' })
      .where(and(
        eq(schema.invoices.tenantId, user.tenantId),
        eq(schema.invoices.status, 'sent'),
        lt(schema.invoices.dueDate, today)
      ));

    let conditions = [
      eq(schema.invoices.tenantId, user.tenantId),
      isNull(schema.invoices.deletedAt)
    ];
    
    if (clientId) conditions.push(eq(schema.invoices.clientId, parseInt(clientId)));
    if (status) conditions.push(eq(schema.invoices.status, status as any));
    if (from) conditions.push(sql`${schema.invoices.issueDate} >= ${from}`);
    if (to) conditions.push(sql`${schema.invoices.issueDate} <= ${to}`);
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(sql`(${schema.invoices.invoiceNumber} ILIKE ${searchPattern} OR ${schema.invoices.title} ILIKE ${searchPattern})`);
    }

    const offset = (page - 1) * limit;

    const [countRes] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(schema.invoices)
      .where(and(...conditions));
    const total = countRes.count;

    const data = await db.select().from(schema.invoices)
      .where(and(...conditions))
      .orderBy(desc(schema.invoices.createdAt))
      .limit(limit)
      .offset(offset);
      
    const clientIds = [...new Set(data.map((i: any) => i.clientId).filter(Boolean))] as number[];
    const projectIds = [...new Set(data.map((i: any) => i.projectId).filter(Boolean))] as number[];
    
    const clients = clientIds.length > 0 ? await db.select().from(schema.clients).where(inArray(schema.clients.id, clientIds)) : [];
    const projects = projectIds.length > 0 ? await db.select().from(schema.projects).where(inArray(schema.projects.id, projectIds)) : [];

    const formatted = data.map((invoiceData: any) => {
      const client = clients.find(c => c.id === invoiceData.clientId) || null;
      const project = projects.find(p => p.id === invoiceData.projectId) || null;
      return { invoice: invoiceData, client, project };
    });

    // Compute overall stats for the tenant (unfiltered by current search/status)
    const allInvoicesSummary = await db.select({
      id: schema.invoices.id,
      status: schema.invoices.status,
      total: schema.invoices.total,
      paidAmount: schema.invoices.paidAmount,
      dueDate: schema.invoices.dueDate,
    }).from(schema.invoices).where(and(
      eq(schema.invoices.tenantId, user.tenantId),
      isNull(schema.invoices.deletedAt)
    ));

    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    const statusCounts: Record<string, number> = {
      all: allInvoicesSummary.length,
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0,
    };

    for (const inv of allInvoicesSummary) {
      const invTotal = parseFloat(inv.total || '0') || 0;
      const invPaid = parseFloat(inv.paidAmount || '0') || 0;
      const invStatus = (inv.status || 'draft') as string;
      
      if (statusCounts[invStatus] !== undefined) {
        statusCounts[invStatus]++;
      }
      
      if (invStatus !== 'cancelled') {
        totalInvoiced += invTotal;
        totalPaid += invPaid;
        
        if (invStatus !== 'paid') {
          const balance = Math.max(0, invTotal - invPaid);
          totalOutstanding += balance;
          if (invStatus === 'overdue') {
            overdueCount++;
            overdueAmount += balance;
          }
        }
      }
    }

    return c.json({
      data: formatted,
      total,
      page,
      limit,
      stats: {
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        overdueCount,
        overdueAmount,
        statusCounts
      }
    });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

invoicesRoutes.get('/overdue', requireAdmin, async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    await db.update(schema.invoices)
      .set({ status: 'overdue' })
      .where(and(
        eq(schema.invoices.tenantId, user.tenantId),
        eq(schema.invoices.status, 'sent'),
        lt(schema.invoices.dueDate, today)
      ));
      
    const data = await db.select().from(schema.invoices).where(and(
      eq(schema.invoices.tenantId, user.tenantId),
      eq(schema.invoices.status, 'overdue'),
      isNull(schema.invoices.deletedAt)
    )).orderBy(desc(schema.invoices.dueDate));
    
    return c.json(data);
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

invoicesRoutes.post('/', requireAdmin, async (c) => {
  const admin = c.get('user');
  const data = await c.req.json();
  const db = c.get('db');

  try {
    if (data.clientId) {
      const [clientCheck] = await db.select({ id: schema.clients.id }).from(schema.clients).where(and(eq(schema.clients.id, data.clientId), eq(schema.clients.tenantId, admin.tenantId))).limit(1);
      if (!clientCheck) return c.json({ error: 'Invalid client association' }, 403);
    }
    if (data.projectId) {
      const [projectCheck] = await db.select({ id: schema.projects.id }).from(schema.projects).where(and(eq(schema.projects.id, data.projectId), eq(schema.projects.tenantId, admin.tenantId))).limit(1);
      if (!projectCheck) return c.json({ error: 'Invalid project association' }, 403);
    }

    const subtotal = calculateSubtotal(data.items);
    const tax = data.tax || '0.00';
    const discount = data.discount || '0.00';
    const total = calculateTotal(subtotal, tax, discount);

    const invoiceId = await db.transaction(async (tx: any) => {
      const invoiceNumber = await generateInvoiceNumber(tx, admin.tenantId);

      const [newInvoice] = await tx.insert(schema.invoices).values({
        tenantId: admin.tenantId,
        clientId: data.clientId,
        projectId: data.projectId,
        invoiceNumber: invoiceNumber,
        title: data.title,
        issueDate: new Date().toISOString(),
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        subtotal: subtotal,
        tax: tax,
        discount: discount,
        total: total,
        currency: data.currency || 'LKR',
        exchangeRate: data.exchangeRate ? data.exchangeRate.toString() : '1.000000',
        status: 'draft',
        notes: data.notes,
        terms: data.terms,
        createdBy: parseInt(admin.sub as string),
      }).returning({ id: schema.invoices.id });

      if (data.items && data.items.length > 0) {
        await tx.insert(schema.invoiceItems).values(data.items.map((item: any) => ({
          invoiceId: newInvoice.id,
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          amount: calculateLineItemAmount(item.quantity, item.unitPrice),
        })));
      }

      await tx.insert(schema.activityLogs).values({
        tenantId: admin.tenantId,
        userId: parseInt(admin.sub as string),
        entityType: 'invoice',
        entityId: newInvoice.id,
        action: `Invoice ${invoiceNumber} created.`,
      });
      
      return newInvoice.id;
    });

    return c.json({ success: true, invoiceId });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

invoicesRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const invoiceId = parseInt(c.req.param('id'));
  const db = c.get('db');

  try {
    const [invoiceData] = await db.select().from(schema.invoices).where(
      and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.tenantId, user.tenantId), isNull(schema.invoices.deletedAt))
    ).limit(1);
    if (!invoiceData) return c.json({ error: 'Invoice not found or unauthorized' }, 404);

    let client = null;
    let project = null;

    if (invoiceData.clientId) {
      [client] = await db.select().from(schema.clients).where(eq(schema.clients.id, invoiceData.clientId)).limit(1);
    }
    
    if (invoiceData.projectId) {
      [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, invoiceData.projectId)).limit(1);
    }

    if (user.role === 'client') {
      const [clientRecord] = await db.select().from(schema.clients).where(eq(schema.clients.userId, parseInt(user.sub as string))).limit(1);
      if (!clientRecord || invoiceData.clientId !== clientRecord.id) {
        return c.json({ error: 'Unauthorized' }, 403);
      }
    }

    const items = await db.select().from(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, invoiceId));
    
    const logs = await db.select().from(schema.activityLogs)
      .where(and(eq(schema.activityLogs.entityType, 'invoice'), eq(schema.activityLogs.entityId, invoiceId)))
      .orderBy(desc(schema.activityLogs.createdAt));

    const proofs = await db.select().from(schema.paymentProofs)
      .where(eq(schema.paymentProofs.invoiceId, invoiceId))
      .orderBy(desc(schema.paymentProofs.uploadedAt));
    
    return c.json({
      invoice: invoiceData,
      client: client,
      project: project,
      items: items || [],
      logs,
      proofs
    });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

invoicesRoutes.post('/:id/send', requireAdmin, async (c) => {
  const admin = c.get('user');
  const invoiceId = parseInt(c.req.param('id'));
  const db = c.get('db');
  const body = await c.req.json().catch(() => ({}));
  
  try {
    const [invoiceData] = await db.select().from(schema.invoices).where(
      and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.tenantId, admin.tenantId), isNull(schema.invoices.deletedAt))
    ).limit(1);
    
    if (!invoiceData) return c.json({ error: 'Invoice not found' }, 404);
    if (invoiceData.status === 'cancelled') {
      return c.json({ error: 'Cannot send a cancelled invoice' }, 400);
    }
    
    const [client] = invoiceData.clientId ? await db.select().from(schema.clients).where(eq(schema.clients.id, invoiceData.clientId)).limit(1) : [null];
    
    // Determine 'To' recipients
    let toList: string[] = [];
    if (Array.isArray(body.to)) {
      toList = body.to.map((e: any) => String(e).trim()).filter(Boolean);
    } else if (typeof body.to === 'string' && body.to.trim()) {
      toList = body.to.split(',').map((e: string) => e.trim()).filter(Boolean);
    }
    if (toList.length === 0 && client?.email) {
      toList = [client.email.trim()];
    }
    if (toList.length === 0) {
      return c.json({ error: 'No recipient email specified and client has no email on file' }, 400);
    }

    // Determine 'CC' recipients
    let ccList: string[] = [];
    if (Array.isArray(body.cc)) {
      ccList = body.cc.map((e: any) => String(e).trim()).filter(Boolean);
    } else if (typeof body.cc === 'string' && body.cc.trim()) {
      ccList = body.cc.split(',').map((e: string) => e.trim()).filter(Boolean);
    }

    // Determine 'BCC' recipients
    let bccList: string[] = [];
    if (Array.isArray(body.bcc)) {
      bccList = body.bcc.map((e: any) => String(e).trim()).filter(Boolean);
    } else if (typeof body.bcc === 'string' && body.bcc.trim()) {
      bccList = body.bcc.split(',').map((e: string) => e.trim()).filter(Boolean);
    }

    // Fetch line items for detailed email breakdown
    const items = await db.select().from(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, invoiceId));

    // Fetch tenant settings
    const tenantSettings = await db.select({ key: schema.settings.settingKey, value: schema.settings.settingValue }).from(schema.settings).where(eq(schema.settings.tenantId, admin.tenantId));
    const settingsMap = tenantSettings.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {});
    
    const currencySymbol = invoiceData.currency || settingsMap['currencySymbol'] || 'LKR';
    const companyName = settingsMap['company_name'] || 'Shatter';
    const clientName = client?.contactPerson || client?.companyName || 'Valued Client';
    const totalFormatted = `${currencySymbol} ${parseFloat(invoiceData.total || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const dueDateFormatted = invoiceData.dueDate ? new Date(invoiceData.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Upon Receipt';
    
    const isOverdue = invoiceData.status === 'overdue';
    const defaultSubject = isOverdue
      ? `Payment Reminder: Invoice ${invoiceData.invoiceNumber} from ${companyName} (${totalFormatted})`
      : `Invoice ${invoiceData.invoiceNumber} from ${companyName} (${totalFormatted})`;
    
    const subject = body.subject?.trim() || defaultSubject;
    const attachPdf = body.attachPdf !== false;
    const includePortalLink = body.includePortalLink !== false;
    const portalUrl = settingsMap['portal_url'] || 'https://client.meetshatter.com/login';

    // Format custom message block
    const userMessageHtml = body.message?.trim()
      ? `<div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 6px; margin: 20px 0; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${body.message.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
      : `<p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 16px 0;">Dear <strong>${clientName}</strong>,</p>
         <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 16px 0;">Please find attached invoice <strong>#${invoiceData.invoiceNumber}</strong> for services rendered by <strong>${companyName}</strong>. A summary of your billing is provided below for convenience.</p>`;

    // Format line items HTML
    const lineItemsHtml = (items || []).map((item: any) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 12px; font-size: 13px; color: #1e293b;">${item.description}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #64748b; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #64748b; text-align: right;">${currencySymbol} ${parseFloat(item.unitPrice).toFixed(2)}</td>
        <td style="padding: 10px 12px; font-size: 13px; font-weight: 600; color: #1e293b; text-align: right;">${currencySymbol} ${parseFloat(item.amount).toFixed(2)}</td>
      </tr>
    `).join('');

    // Summary amounts
    const subtotalFormatted = `${currencySymbol} ${parseFloat(invoiceData.subtotal || '0').toFixed(2)}`;
    const taxFormatted = parseFloat(invoiceData.tax || '0') > 0 ? `${currencySymbol} ${parseFloat(invoiceData.tax).toFixed(2)}` : null;
    const discountFormatted = parseFloat(invoiceData.discount || '0') > 0 ? `-${currencySymbol} ${parseFloat(invoiceData.discount).toFixed(2)}` : null;
    const paidFormatted = parseFloat(invoiceData.paidAmount || '0') > 0 ? `${currencySymbol} ${parseFloat(invoiceData.paidAmount).toFixed(2)}` : null;
    const balanceDue = Math.max(0, parseFloat(invoiceData.total || '0') - parseFloat(invoiceData.paidAmount || '0'));
    const balanceDueFormatted = `${currencySymbol} ${balanceDue.toFixed(2)}`;

    // Optional portal login button
    const portalButtonHtml = includePortalLink ? `
      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${portalUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px; display: inline-block;">View in Client Portal →</a>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">(Optional: You can also manage files, contracts, and view project milestones online)</p>
      </div>
    ` : '';

    // Attachment notification banner
    const hasPdfBase64 = attachPdf && Boolean(body.pdfBase64);
    const attachmentNoticeHtml = hasPdfBase64 ? `
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 16px; margin: 20px 0;">
        <div style="font-size: 13px; color: #065f46; font-weight: 500;">
          📎 <strong>Invoice PDF Attached:</strong> <code>${invoiceData.invoiceNumber}.pdf</code> is attached to this email. You can download and save it immediately without logging in.
        </div>
      </div>
    ` : '';

    // Bank details / payment instructions if configured
    const bankDetails = settingsMap['bank_details'] || settingsMap['payment_instructions'];
    const bankDetailsHtml = bankDetails ? `
      <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 14px 16px; margin: 20px 0;">
        <p style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 0.5px;">Payment Details / Bank Transfer Instructions:</p>
        <p style="font-size: 13px; color: #334155; margin: 0; white-space: pre-wrap;">${bankDetails}</p>
      </div>
    ` : '';

    // Modern responsive email HTML template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Top Header -->
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 32px; color: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #f8fafc;">${companyName}</h1>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Official Invoice</p>
              </div>
              <div style="text-align: right;">
                <span style="background-color: ${isOverdue ? '#e11d48' : '#f59e0b'}; color: ${isOverdue ? '#ffffff' : '#000000'}; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${isOverdue ? 'Overdue' : 'Due ' + dueDateFormatted}
                </span>
              </div>
            </div>
          </div>

          <!-- Highlight Card -->
          <div style="padding: 24px 32px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td>
                  <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Invoice Number</p>
                  <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 800; color: #0f172a;">${invoiceData.invoiceNumber}</p>
                </td>
                <td style="text-align: right;">
                  <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Total Amount Due</p>
                  <p style="margin: 4px 0 0 0; font-size: 22px; font-weight: 900; color: #0f172a;">${balanceDueFormatted}</p>
                </td>
              </tr>
            </table>
          </div>

          <!-- Body Content -->
          <div style="padding: 32px;">
            ${userMessageHtml}
            ${attachmentNoticeHtml}

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 13px;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1;">
                  <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700;">Description</th>
                  <th style="padding: 10px 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700;">Qty</th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700;">Rate</th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${lineItemsHtml}
              </tbody>
            </table>

            <!-- Totals Box -->
            <div style="text-align: right; margin: 16px 0;">
              <table style="width: 250px; margin-left: auto; font-size: 13px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; text-align: left;">Subtotal:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b;">${subtotalFormatted}</td>
                </tr>
                ${taxFormatted ? `
                <tr>
                  <td style="padding: 4px 0; color: #64748b; text-align: left;">Tax:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b;">${taxFormatted}</td>
                </tr>` : ''}
                ${discountFormatted ? `
                <tr>
                  <td style="padding: 4px 0; color: #64748b; text-align: left;">Discount:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b;">${discountFormatted}</td>
                </tr>` : ''}
                <tr style="border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                  <td style="padding: 8px 0; font-weight: 700; color: #0f172a; text-align: left;">Invoice Total:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 800; color: #0f172a;">${totalFormatted}</td>
                </tr>
                ${paidFormatted ? `
                <tr>
                  <td style="padding: 4px 0; color: #059669; font-weight: 600; text-align: left;">Amount Paid:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #059669;">-${paidFormatted}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 8px 0; font-weight: 800; font-size: 15px; color: #0f172a; text-align: left;">Balance Due:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 800; font-size: 16px; color: #0f172a;">${balanceDueFormatted}</td>
                </tr>
              </table>
            </div>

            ${bankDetailsHtml}
            ${portalButtonHtml}

          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0;">Thank you for your business! | <strong>${companyName}</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Prepare attachments
    let attachments: any[] | undefined = undefined;
    if (hasPdfBase64) {
      const cleanBase64 = String(body.pdfBase64)
        .replace(/^data:application\/pdf;filename=[^;]+;base64,/, '')
        .replace(/^data:application\/pdf;base64,/, '')
        .replace(/^data:application\/octet-stream;base64,/, '')
        .trim();

      if (cleanBase64) {
        attachments = [{
          filename: `${invoiceData.invoiceNumber}.pdf`,
          content: cleanBase64,
        }];
      }
    }

    const resendApiKey = settingsMap['resend_api_key'] || c.env.RESEND_API_KEY;
    const fromEmail = settingsMap['from_email'] || 'Shatter DAMS Billing <hello@mailer.meetshatter.com>';

    const emailPayload: any = {
      from: fromEmail,
      to: toList,
      subject: subject,
      html: emailHtml,
    };
    if (ccList.length > 0) emailPayload.cc = ccList;
    if (bccList.length > 0) emailPayload.bcc = bccList;
    if (attachments && attachments.length > 0) emailPayload.attachments = attachments;

    if (!resendApiKey || resendApiKey.startsWith('re_dummy')) {
      console.warn('Resend API key missing or dummy, simulating send:', {
        to: toList,
        cc: ccList,
        subject,
        hasAttachments: !!attachments?.length
      });
    } else {
      const resend = new Resend(resendApiKey);
      const resendResult = await resend.emails.send(emailPayload);
      if (resendResult.error) {
        console.error('Resend error:', resendResult.error);
        return c.json({ error: `Failed to send email: ${resendResult.error.message || 'Email delivery failed'}` }, 502);
      }
    }

    // Update status to 'sent' if currently 'draft'
    await db.transaction(async (tx: any) => {
      if (invoiceData.status === 'draft') {
        await tx.update(schema.invoices).set({ status: 'sent', updatedAt: new Date().toISOString() }).where(eq(schema.invoices.id, invoiceId));
      }
      
      const ccStr = ccList.length > 0 ? ` (CC: ${ccList.join(', ')})` : '';
      const bccStr = bccList.length > 0 ? ` (BCC: ${bccList.join(', ')})` : '';
      const attachStr = attachments && attachments.length > 0 ? ' [PDF attached]' : '';
      
      await tx.insert(schema.activityLogs).values({
        tenantId: admin.tenantId,
        userId: parseInt(admin.sub as string),
        entityType: 'invoice',
        entityId: invoiceId,
        action: `Invoice ${invoiceData.invoiceNumber} emailed to ${toList.join(', ')}${ccStr}${bccStr}${attachStr}.`,
      });
    });

    return c.json({
      success: true,
      recipients: {
        to: toList,
        cc: ccList,
        bcc: bccList,
      },
      attachedPdf: !!(attachments && attachments.length > 0)
    });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

invoicesRoutes.patch('/:id/paid', requireAdmin, async (c) => {
  const admin = c.get('user');
  const invoiceId = parseInt(c.req.param('id'));
  const db = c.get('db');
  const data = await c.req.json().catch(() => ({}));

  try {
    const [invoiceData] = await db.select().from(schema.invoices).where(
      and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.tenantId, admin.tenantId), isNull(schema.invoices.deletedAt))
    ).limit(1);
    
    if (!invoiceData) return c.json({ error: 'Invoice not found' }, 404);

    let newPaidAmount = invoiceData.total;
    let newStatus = 'paid';

    if (data.amount) {
      newPaidAmount = addAmounts(invoiceData.paidAmount || '0.00', data.amount);
      if (isFullyPaid(invoiceData.total, newPaidAmount)) {
         newStatus = 'paid';
         newPaidAmount = invoiceData.total;
      } else {
         newStatus = invoiceData.status === 'draft' ? 'sent' : invoiceData.status;
      }
    }

    if (!canTransitionInvoice(invoiceData.status as InvoiceStatus, newStatus as InvoiceStatus)) {
       return c.json({ error: 'Invalid status transition' }, 400);
    }

    await db.transaction(async (tx: any) => {
      await tx.update(schema.invoices).set({ 
        status: newStatus as any, 
        paidAmount: newPaidAmount,
        paidDate: newStatus === 'paid' ? new Date().toISOString() : invoiceData.paidDate
      }).where(eq(schema.invoices.id, invoiceId));
      
      const methodStr = data.paymentMethod ? ` via ${data.paymentMethod}` : '';
      const refStr = data.reference ? ` (Ref: ${data.reference})` : '';
      
      await tx.insert(schema.activityLogs).values({
        tenantId: admin.tenantId,
        userId: parseInt(admin.sub as string),
        entityType: 'invoice',
        entityId: invoiceId,
        action: `Payment of ${data.amount || invoiceData.total}${methodStr}${refStr} logged for Invoice ${invoiceData.invoiceNumber}.`,
      });
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

invoicesRoutes.put('/:id', requireAdmin, async (c) => {
  const admin = c.get('user');
  const invoiceId = parseInt(c.req.param('id'));
  const data = await c.req.json();
  const db = c.get('db');

  try {
    const [invoiceData] = await db.select().from(schema.invoices).where(
      and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.tenantId, admin.tenantId), isNull(schema.invoices.deletedAt))
    ).limit(1);
    
    if (!invoiceData) return c.json({ error: 'Invoice not found' }, 404);

    if (data.clientId) {
      const [clientCheck] = await db.select({ id: schema.clients.id }).from(schema.clients).where(and(eq(schema.clients.id, data.clientId), eq(schema.clients.tenantId, admin.tenantId))).limit(1);
      if (!clientCheck) return c.json({ error: 'Invalid client association' }, 403);
    }
    if (data.projectId) {
      const [projectCheck] = await db.select({ id: schema.projects.id }).from(schema.projects).where(and(eq(schema.projects.id, data.projectId), eq(schema.projects.tenantId, admin.tenantId))).limit(1);
      if (!projectCheck) return c.json({ error: 'Invalid project association' }, 403);
    }

    const subtotal = calculateSubtotal(data.items);
    const tax = data.tax || '0.00';
    const discount = data.discount || '0.00';
    const total = calculateTotal(subtotal, tax, discount);
    
    const targetStatus = data.status || invoiceData.status;
    if (!canTransitionInvoice(invoiceData.status as InvoiceStatus, targetStatus as InvoiceStatus)) {
       return c.json({ error: 'Invalid status transition' }, 400);
    }

    await db.transaction(async (tx: any) => {
      await tx.update(schema.invoices).set({
        clientId: data.clientId,
        projectId: data.projectId,
        title: data.title,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        subtotal: subtotal,
        tax: tax,
        discount: discount,
        total: total,
        currency: data.currency || invoiceData.currency,
        exchangeRate: data.exchangeRate ? data.exchangeRate.toString() : invoiceData.exchangeRate,
        status: targetStatus,
        notes: data.notes,
        terms: data.terms,
        updatedAt: new Date().toISOString()
      }).where(eq(schema.invoices.id, invoiceId));

      await tx.delete(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, invoiceId));
      
      if (data.items && data.items.length > 0) {
        await tx.insert(schema.invoiceItems).values(data.items.map((item: any) => ({
          invoiceId: invoiceId,
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          amount: calculateLineItemAmount(item.quantity, item.unitPrice),
        })));
      }
      
      await tx.insert(schema.activityLogs).values({
        tenantId: admin.tenantId,
        userId: parseInt(admin.sub as string),
        entityType: 'invoice',
        entityId: invoiceId,
        action: `Invoice ${invoiceData.invoiceNumber} updated.`,
      });
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

invoicesRoutes.post('/:id/duplicate', requireAdmin, async (c) => {
  const admin = c.get('user');
  const invoiceId = parseInt(c.req.param('id'));
  const db = c.get('db');
  
  try {
    const [invoiceData] = await db.select().from(schema.invoices).where(
      and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.tenantId, admin.tenantId), isNull(schema.invoices.deletedAt))
    ).limit(1);
    
    if (!invoiceData) return c.json({ error: 'Invoice not found' }, 404);
    
    const items = await db.select().from(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, invoiceId));
    
    const newInvoiceId = await db.transaction(async (tx: any) => {
      const invoiceNumber = await generateInvoiceNumber(tx, admin.tenantId);
      
      const [newInvoice] = await tx.insert(schema.invoices).values({
        tenantId: admin.tenantId,
        clientId: invoiceData.clientId,
        projectId: invoiceData.projectId,
        invoiceNumber: invoiceNumber,
        title: invoiceData.title ? `${invoiceData.title} (Copy)` : undefined,
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 14*24*60*60*1000).toISOString(),
        subtotal: invoiceData.subtotal,
        tax: invoiceData.tax,
        discount: invoiceData.discount,
        total: invoiceData.total,
        currency: invoiceData.currency,
        exchangeRate: invoiceData.exchangeRate,
        status: 'draft',
        notes: invoiceData.notes,
        terms: invoiceData.terms,
        createdBy: parseInt(admin.sub as string),
      }).returning({ id: schema.invoices.id });
      
      if (items && items.length > 0) {
        await tx.insert(schema.invoiceItems).values(items.map((item: any) => ({
          invoiceId: newInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })));
      }
      
      await tx.insert(schema.activityLogs).values({
        tenantId: admin.tenantId,
        userId: parseInt(admin.sub as string),
        entityType: 'invoice',
        entityId: newInvoice.id,
        action: `Invoice ${invoiceNumber} created as a duplicate of ${invoiceData.invoiceNumber}.`,
      });
      
      return newInvoice.id;
    });
    
    return c.json({ success: true, invoiceId: newInvoiceId });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

invoicesRoutes.delete('/:id', requireAdmin, async (c) => {
  const admin = c.get('user');
  const invoiceId = parseInt(c.req.param('id'));
  const db = c.get('db');
  
  try {
    await db.transaction(async (tx: any) => {
      await tx.update(schema.invoices).set({ deletedAt: new Date().toISOString() })
        .where(and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.tenantId, admin.tenantId)));
        
      await tx.insert(schema.activityLogs).values({
        tenantId: admin.tenantId,
        userId: parseInt(admin.sub as string),
        entityType: 'invoice',
        entityId: invoiceId,
        action: `Invoice deleted.`,
      });
    });
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

invoicesRoutes.post('/:id/payment-proof', requireAdmin, async (c) => {
  const admin = c.get('user');
  const invoiceId = parseInt(c.req.param('id'));
  const db = c.get('db');
  
  try {
    const data = await c.req.json(); // { fileName, fileSize, mimeType }
    
    const [invoiceData] = await db.select().from(schema.invoices).where(
      and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.tenantId, admin.tenantId), isNull(schema.invoices.deletedAt))
    ).limit(1);
    
    if (!invoiceData) return c.json({ error: 'Invoice not found' }, 404);

    const ext = data.fileName.split('.').pop() || '';
    const filePath = `tenants/${admin.tenantId}/payment-proofs/${invoiceData.invoiceNumber}_${Date.now()}.${ext}`;
    
    const uploadUrl = await generateUploadUrl(filePath, data.mimeType || 'application/octet-stream', c.env as any);
    
    return c.json({ 
      success: true, 
      uploadUrl,
      filePath
    });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

invoicesRoutes.post('/:id/payment-proof/confirm', requireAdmin, async (c) => {
  const admin = c.get('user');
  const invoiceId = parseInt(c.req.param('id'));
  const data = await c.req.json();
  const db = c.get('db');
  
  try {
    await db.insert(schema.paymentProofs).values({
      invoiceId: invoiceId,
      filePath: data.filePath,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      uploadedBy: parseInt(admin.sub as string),
    });
    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

invoicesRoutes.get('/:id/payment-proofs', requireAdmin, async (c) => {
  const admin = c.get('user');
  const invoiceId = parseInt(c.req.param('id'));
  const db = c.get('db');
  
  try {
    const [invoiceData] = await db.select().from(schema.invoices).where(
      and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.tenantId, admin.tenantId))
    ).limit(1);
    if (!invoiceData) return c.json({ error: 'Invoice not found' }, 404);
    
    const proofs = await db.select().from(schema.paymentProofs).where(eq(schema.paymentProofs.invoiceId, invoiceId));
    return c.json(proofs);
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default invoicesRoutes;
