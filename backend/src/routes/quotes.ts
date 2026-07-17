import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import { getDb } from '../db/client';
import * as schema from '../db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { Resend } from 'resend';

const quotesRoutes = new Hono<{ Bindings: { DATABASE_URL: string, RESEND_API_KEY: string }, Variables: { user: any } }>();

quotesRoutes.use('*', requireAuth);

async function generateQuoteNumber(db: any, tenantId: number) {
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;
  
  const [latest] = await db.select({ quoteNumber: schema.quotations.quoteNumber })
    .from(schema.quotations)
    .where(eq(schema.quotations.tenantId, tenantId))
    .orderBy(desc(schema.quotations.id))
    .limit(1);

  let sequence = 1;
  if (latest && latest.quoteNumber.startsWith(prefix)) {
    const lastSeq = parseInt(latest.quoteNumber.split('-')[2], 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }
  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

quotesRoutes.get('/', requireAdmin, async (c) => {
  const user = c.get('user');
  const clientId = c.req.query('clientId');
  const db = getDb(c.env.DATABASE_URL);
  
  try {
    const conditions = [eq(schema.quotations.tenantId, user.tenantId)];
    if (clientId) {
      conditions.push(eq(schema.quotations.clientId, parseInt(clientId)));
    }
    
    const data = await db.select().from(schema.quotations).where(and(...conditions)).orderBy(desc(schema.quotations.createdAt));
      
    const clientIds = [...new Set(data.map(i => i.clientId).filter(Boolean))] as number[];
    const clients = clientIds.length > 0 ? await db.select().from(schema.clients).where(inArray(schema.clients.id, clientIds)) : [];

    const formatted = data.map((quoteData) => {
      const client = clients.find(c => c.id === quoteData.clientId) || null;
      return { quote: quoteData, client };
    });

    return c.json(formatted);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

quotesRoutes.post('/', requireAdmin, async (c) => {
  const admin = c.get('user');
  const data = await c.req.json();
  const db = getDb(c.env.DATABASE_URL);

  try {
    const quoteNumber = await generateQuoteNumber(db, admin.tenantId);
    const subtotal = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);

    const [newQuote] = await db.insert(schema.quotations).values({
      tenantId: admin.tenantId,
      clientId: data.clientId,
      quoteNumber: quoteNumber,
      issueDate: new Date().toISOString(),
      validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString(),
      subtotal: subtotal.toString(),
      tax: '0',
      total: subtotal.toString(),
      status: 'draft',
      notes: data.notes,
      createdBy: parseInt(admin.sub as string),
    }).returning({ id: schema.quotations.id });

    if (!newQuote) return c.json({ error: 'Failed to create quote' }, 500);
    const quotationId = newQuote.id;

    if (data.items && data.items.length > 0) {
      await db.insert(schema.quotationItems).values(data.items.map((item: any) => ({
        quotationId: quotationId,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        amount: (item.quantity * item.unitPrice).toString(),
      })));
    }

    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: `Quotation ${quoteNumber} created.`,
    });

    return c.json({ success: true, quoteId: quotationId });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

quotesRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const quoteId = parseInt(c.req.param('id'));
  const db = getDb(c.env.DATABASE_URL);

  try {
    const [quoteData] = await db.select().from(schema.quotations).where(eq(schema.quotations.id, quoteId)).limit(1);
    if (!quoteData) return c.json({ error: 'Quote not found' }, 404);
    
    if (quoteData.tenantId !== user.tenantId) return c.json({ error: 'Unauthorized' }, 403);

    let client = null;

    if (quoteData.clientId) {
      [client] = await db.select().from(schema.clients).where(eq(schema.clients.id, quoteData.clientId)).limit(1);
    }

    if (user.role === 'client') {
      const [clientRecord] = await db.select().from(schema.clients).where(eq(schema.clients.userId, parseInt(user.sub as string))).limit(1);
      if (!clientRecord || quoteData.clientId !== clientRecord.id) {
        return c.json({ error: 'Unauthorized' }, 403);
      }
    }

    const items = await db.select().from(schema.quotationItems).where(eq(schema.quotationItems.quotationId, quoteId));
    
    return c.json({
      quote: quoteData,
      client: client,
      items: items || []
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

quotesRoutes.post('/:id/send', requireAdmin, async (c) => {
  const admin = c.get('user');
  const quoteId = parseInt(c.req.param('id'));
  const db = getDb(c.env.DATABASE_URL);
  const resend = new Resend(c.env.RESEND_API_KEY || 're_dummy');
  
  try {
    const [quoteData] = await db.select().from(schema.quotations).where(eq(schema.quotations.id, quoteId)).limit(1);
    if (!quoteData) return c.json({ error: 'Quote not found' }, 404);
    
    const [client] = quoteData.clientId ? await db.select().from(schema.clients).where(eq(schema.clients.id, quoteData.clientId)).limit(1) : [null];
    const clientEmail = client?.email;
    
    if (!clientEmail) return c.json({ error: 'Client has no email address' }, 400);

    await resend.emails.send({
      from: 'Shatter DAMS Sales <hello@mailer.meetshatter.com>',
      to: [clientEmail],
      subject: `Quotation ${quoteData.quoteNumber} from Shatter`,
      html: `
        <h2>Quotation ${quoteData.quoteNumber}</h2>
        <p>Dear ${client?.contactPerson || client?.companyName},</p>
        <p>We have prepared a new quotation for you for the amount of <strong>$${quoteData.total}</strong>.</p>
        <p>Please log in to your portal to review and accept the quotation.</p>
        <p><strong>Portal Login:</strong> https://client.meetshatter.com/login</p>
        <br/>
        <p>Thank you!</p>
      `,
    });

    await db.update(schema.quotations).set({ status: 'sent' }).where(eq(schema.quotations.id, quoteId));
    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: `Quotation ${quoteData.quoteNumber} sent to client.`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

quotesRoutes.patch('/:id/accept', async (c) => {
  const user = c.get('user');
  const quoteId = parseInt(c.req.param('id'));
  const db = getDb(c.env.DATABASE_URL);

  try {
    const [quoteData] = await db.select().from(schema.quotations).where(eq(schema.quotations.id, quoteId)).limit(1);
    if (!quoteData) return c.json({ error: 'Quote not found' }, 404);

    await db.update(schema.quotations).set({ status: 'accepted' }).where(eq(schema.quotations.id, quoteId));
    await db.insert(schema.activityLogs).values({
      tenantId: user.tenantId,
      userId: parseInt(user.sub as string),
      action: `Quotation ${quoteData.quoteNumber} accepted.`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

quotesRoutes.put('/:id', requireAdmin, async (c) => {
  const admin = c.get('user');
  const quoteId = parseInt(c.req.param('id'));
  const data = await c.req.json();
  const db = getDb(c.env.DATABASE_URL);

  try {
    const subtotal = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);

    await db.update(schema.quotations).set({
      clientId: data.clientId,
      validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : undefined,
      subtotal: subtotal.toString(),
      total: subtotal.toString(),
      status: data.status || 'draft',
      notes: data.notes,
    }).where(and(eq(schema.quotations.id, quoteId), eq(schema.quotations.tenantId, admin.tenantId)));

    await db.delete(schema.quotationItems).where(eq(schema.quotationItems.quotationId, quoteId));
    if (data.items && data.items.length > 0) {
      await db.insert(schema.quotationItems).values(data.items.map((item: any) => ({
        quotationId: quoteId,
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

quotesRoutes.delete('/:id', requireAdmin, async (c) => {
  const admin = c.get('user');
  const quoteId = parseInt(c.req.param('id'));
  const db = getDb(c.env.DATABASE_URL);
  
  try {
    await db.delete(schema.quotationItems).where(eq(schema.quotationItems.quotationId, quoteId));
    await db.delete(schema.quotations).where(and(eq(schema.quotations.id, quoteId), eq(schema.quotations.tenantId, admin.tenantId)));
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default quotesRoutes;
