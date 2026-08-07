import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import * as schema from '../db/schema';
import { eq, and, ne, inArray, desc, isNull, lt, sql } from 'drizzle-orm';
import { Resend } from 'resend';
import { calculateSubtotal, calculateTotal, calculateLineItemAmount, addAmounts, isFullyPaid } from '../lib/calculations';
import { canTransitionInvoice, InvoiceStatus } from '../lib/statusMachine';
import { generateUploadUrl } from '../lib/storage';

const invoicesRoutes = new Hono<{ Bindings: { DATABASE_URL: string, RESEND_API_KEY: string }, Variables: { user: any } }>();

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

    return c.json({ data: formatted, total, page, limit });
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
  
  try {
    const [invoiceData] = await db.select().from(schema.invoices).where(
      and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.tenantId, admin.tenantId), isNull(schema.invoices.deletedAt))
    ).limit(1);
    
    if (!invoiceData) return c.json({ error: 'Invoice not found' }, 404);
    if (!canTransitionInvoice(invoiceData.status as InvoiceStatus, 'sent')) {
      return c.json({ error: 'Invalid status transition' }, 400);
    }
    
    const [client] = invoiceData.clientId ? await db.select().from(schema.clients).where(eq(schema.clients.id, invoiceData.clientId)).limit(1) : [null];
    
    const clientEmail = client?.email;
    if (!clientEmail) return c.json({ error: 'Client has no email address' }, 400);

    const tenantSettings = await db.select({ key: schema.settings.settingKey, value: schema.settings.settingValue }).from(schema.settings).where(eq(schema.settings.tenantId, admin.tenantId));
    const settingsMap = tenantSettings.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {});
    
    const currencySymbol = settingsMap['currencySymbol'] || 'LKR';
    let subject = settingsMap['invoice_email_subject'] || `Invoice {{invoiceNumber}} from Shatter`;
    let html = settingsMap['invoice_email_body'] || `
        <h2>Invoice {{invoiceNumber}}</h2>
        <p>Dear {{clientName}},</p>
        <p>A new invoice has been generated for your account for the amount of <strong>${currencySymbol}{{total}}</strong>.</p>
        <p>You can view and download your invoice securely by logging into your client portal.</p>
        <p><strong>Portal Login:</strong> {{portalLink}}</p>
        <br/>
        <p>Thank you for your business!</p>
    `;

    const variables: Record<string, string> = {
      '{{invoiceNumber}}': invoiceData.invoiceNumber,
      '{{clientName}}': client?.contactPerson || client?.companyName || 'Valued Client',
      '{{total}}': invoiceData.total,
      '{{companyName}}': settingsMap['company_name'] || 'Shatter',
      '{{portalLink}}': 'https://client.meetshatter.com/login'
    };

    for (const [key, val] of Object.entries(variables)) {
      subject = subject.replaceAll(key, val);
      html = html.replaceAll(key, val);
    }

    const resend = new Resend(settingsMap['resend_api_key'] || c.env.RESEND_API_KEY || 're_dummy');

    await resend.emails.send({
      from: 'Shatter DAMS Billing <hello@mailer.meetshatter.com>',
      to: [clientEmail],
      subject: subject,
      html: html,
    });

    await db.transaction(async (tx: any) => {
      await tx.update(schema.invoices).set({ status: 'sent' }).where(eq(schema.invoices.id, invoiceId));
      await tx.insert(schema.activityLogs).values({
        tenantId: admin.tenantId,
        userId: parseInt(admin.sub as string),
        entityType: 'invoice',
        entityId: invoiceId,
        action: `Invoice ${invoiceData.invoiceNumber} sent to client.`,
      });
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
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
