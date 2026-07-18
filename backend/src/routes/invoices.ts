import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import * as schema from '../db/schema';
import { eq, and, ne, inArray, desc } from 'drizzle-orm';
import { Resend } from 'resend';

const invoicesRoutes = new Hono<{ Bindings: { DATABASE_URL: string, RESEND_API_KEY: string }, Variables: { user: any } }>();

invoicesRoutes.use('*', requireAuth);

export async function generateInvoiceNumber(db: any, tenantId: number) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  const [latest] = await db.select({ invoiceNumber: schema.invoices.invoiceNumber })
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
  const db = c.get('db');
  
  try {
    const conditions = [eq(schema.invoices.tenantId, user.tenantId)];
    if (clientId) {
      conditions.push(eq(schema.invoices.clientId, parseInt(clientId)));
    }
    
    const data = await db.select().from(schema.invoices).where(and(...conditions)).orderBy(desc(schema.invoices.createdAt));
      
    // Needs joined clients and projects to match API response format
    const clientIds = [...new Set(data.map(i => i.clientId).filter(Boolean))] as number[];
    const projectIds = [...new Set(data.map(i => i.projectId).filter(Boolean))] as number[];
    
    const clients = clientIds.length > 0 ? await db.select().from(schema.clients).where(inArray(schema.clients.id, clientIds)) : [];
    const projects = projectIds.length > 0 ? await db.select().from(schema.projects).where(inArray(schema.projects.id, projectIds)) : [];

    const formatted = data.map((invoiceData) => {
      const client = clients.find(c => c.id === invoiceData.clientId) || null;
      const project = projects.find(p => p.id === invoiceData.projectId) || null;
      return { invoice: invoiceData, client, project };
    });

    return c.json(formatted);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
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

    const invoiceNumber = await generateInvoiceNumber(db, admin.tenantId);
    const subtotal = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const tax = parseFloat(data.tax || '0');
    const discount = parseFloat(data.discount || '0');
    const total = subtotal + tax - discount;

    const [newInvoice] = await db.insert(schema.invoices).values({
      tenantId: admin.tenantId,
      clientId: data.clientId,
      projectId: data.projectId,
      invoiceNumber: invoiceNumber,
      issueDate: new Date().toISOString(),
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString(),
      subtotal: subtotal.toString(),
      tax: tax.toString(),
      discount: discount.toString(),
      total: total.toString(),
      currency: data.currency || 'USD',
      exchangeRate: data.exchangeRate ? data.exchangeRate.toString() : '1.000000',
      status: 'draft',
      notes: data.notes,
      createdBy: parseInt(admin.sub as string),
    }).returning({ id: schema.invoices.id });

    if (!newInvoice) return c.json({ error: 'Failed to create invoice' }, 500);
    const invoiceId = newInvoice.id;

    if (data.items && data.items.length > 0) {
      await db.insert(schema.invoiceItems).values(data.items.map((item: any) => ({
        invoiceId: invoiceId,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        amount: (item.quantity * item.unitPrice).toString(),
      })));
    }

    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: `Invoice ${invoiceNumber} created.`,
    });

    return c.json({ success: true, invoiceId });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

invoicesRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const invoiceId = parseInt(c.req.param('id'));
  const db = c.get('db');

  try {
    const [invoiceData] = await db.select().from(schema.invoices).where(and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.tenantId, user.tenantId))).limit(1);
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
    
    return c.json({
      invoice: invoiceData,
      client: client,
      project: project,
      items: items || []
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

invoicesRoutes.post('/:id/send', requireAdmin, async (c) => {
  const admin = c.get('user');
  const invoiceId = parseInt(c.req.param('id'));
  const db = c.get('db');
  const resend = new Resend(c.env.RESEND_API_KEY || 're_dummy');
  
  try {
    const [invoiceData] = await db.select().from(schema.invoices).where(and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.tenantId, admin.tenantId))).limit(1);
    if (!invoiceData) return c.json({ error: 'Invoice not found' }, 404);
    
    const [client] = invoiceData.clientId ? await db.select().from(schema.clients).where(eq(schema.clients.id, invoiceData.clientId)).limit(1) : [null];
    
    const clientEmail = client?.email;
    if (!clientEmail) return c.json({ error: 'Client has no email address' }, 400);

    await resend.emails.send({
      from: 'Shatter DAMS Billing <hello@mailer.meetshatter.com>',
      to: [clientEmail],
      subject: `Invoice ${invoiceData.invoiceNumber} from Shatter`,
      html: `
        <h2>Invoice ${invoiceData.invoiceNumber}</h2>
        <p>Dear ${client?.contactPerson || client?.companyName},</p>
        <p>A new invoice has been generated for your account for the amount of <strong>$${invoiceData.total}</strong>.</p>
        <p>You can view and download your invoice securely by logging into your client portal.</p>
        <p><strong>Portal Login:</strong> https://client.meetshatter.com/login</p>
        <br/>
        <p>Thank you for your business!</p>
      `,
    });

    await db.update(schema.invoices).set({ status: 'sent' }).where(eq(schema.invoices.id, invoiceId));
    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: `Invoice ${invoiceData.invoiceNumber} sent to client.`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

invoicesRoutes.patch('/:id/paid', requireAdmin, async (c) => {
  const admin = c.get('user');
  const invoiceId = parseInt(c.req.param('id'));
  const db = c.get('db');
  const data = await c.req.json().catch(() => ({}));

  try {
    const [invoiceData] = await db.select().from(schema.invoices).where(and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.tenantId, admin.tenantId))).limit(1);
    if (!invoiceData) return c.json({ error: 'Invoice not found' }, 404);

    let newPaidAmount = parseFloat(invoiceData.total);
    let newStatus = 'paid';

    if (data.amount !== undefined) {
       newPaidAmount = parseFloat(invoiceData.paidAmount || '0') + parseFloat(data.amount);
       if (newPaidAmount >= parseFloat(invoiceData.total)) {
           newStatus = 'paid';
           newPaidAmount = parseFloat(invoiceData.total);
       } else {
           newStatus = invoiceData.status === 'draft' ? 'sent' : invoiceData.status;
       }
    }

    await db.update(schema.invoices).set({ 
      status: newStatus as any, 
      paidAmount: newPaidAmount.toString() 
    }).where(eq(schema.invoices.id, invoiceId));
    
    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: `Payment of ${data.amount || invoiceData.total} logged for Invoice ${invoiceData.invoiceNumber}.`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

invoicesRoutes.put('/:id', requireAdmin, async (c) => {
  const admin = c.get('user');
  const invoiceId = parseInt(c.req.param('id'));
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

    const subtotal = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const tax = parseFloat(data.tax || '0');
    const discount = parseFloat(data.discount || '0');
    const total = subtotal + tax - discount;

    await db.update(schema.invoices).set({
      clientId: data.clientId,
      projectId: data.projectId,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      subtotal: subtotal.toString(),
      tax: tax.toString(),
      discount: discount.toString(),
      total: total.toString(),
      currency: data.currency || 'USD',
      exchangeRate: data.exchangeRate ? data.exchangeRate.toString() : '1.000000',
      status: data.status || 'draft',
      notes: data.notes,
    }).where(and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.tenantId, admin.tenantId)));

    // Re-create items
    await db.delete(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, invoiceId));
    
    if (data.items && data.items.length > 0) {
      await db.insert(schema.invoiceItems).values(data.items.map((item: any) => ({
        invoiceId: invoiceId,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        amount: (item.quantity * item.unitPrice).toString(),
      })));
    }

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

invoicesRoutes.delete('/:id', requireAdmin, async (c) => {
  const admin = c.get('user');
  const invoiceId = parseInt(c.req.param('id'));
  const db = c.get('db');
  
  try {
    await db.delete(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, invoiceId));
    await db.delete(schema.invoices).where(and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.tenantId, admin.tenantId)));
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default invoicesRoutes;
