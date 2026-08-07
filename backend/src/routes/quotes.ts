import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import * as schema from '../db/schema';
import { eq, and, desc, inArray, isNull, sql, lt } from 'drizzle-orm';
import { Resend } from 'resend';
import { calculateSubtotal, calculateTotal, calculateLineItemAmount } from '../lib/calculations';
import { canTransitionQuote, QuoteStatus } from '../lib/statusMachine';

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
  const clientId = c.req.query('client_id');
  const search = c.req.query('search');
  const status = c.req.query('status');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const db = c.get('db');
  
  try {
    const today = new Date().toISOString();
    await db.update(schema.quotations)
      .set({ status: 'expired' })
      .where(and(
        eq(schema.quotations.tenantId, user.tenantId),
        eq(schema.quotations.status, 'sent'),
        lt(schema.quotations.validUntil, today)
      ));

    let conditions = [
      eq(schema.quotations.tenantId, user.tenantId),
      isNull(schema.quotations.deletedAt)
    ];
    if (clientId) conditions.push(eq(schema.quotations.clientId, parseInt(clientId)));
    if (status) conditions.push(eq(schema.quotations.status, status as any));
    if (from) conditions.push(sql`${schema.quotations.issueDate} >= ${from}`);
    if (to) conditions.push(sql`${schema.quotations.issueDate} <= ${to}`);
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(sql`(${schema.quotations.quoteNumber} ILIKE ${searchPattern} OR ${schema.quotations.notes} ILIKE ${searchPattern})`);
    }

    const offset = (page - 1) * limit;

    const [countRes] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(schema.quotations)
      .where(and(...conditions));
    const total = countRes.count;
    
    const data = await db.select().from(schema.quotations)
      .where(and(...conditions))
      .orderBy(desc(schema.quotations.createdAt))
      .limit(limit)
      .offset(offset);
      
    const clientIds = [...new Set(data.map((i: any) => i.clientId).filter(Boolean))] as number[];
    const clients = clientIds.length > 0 ? await db.select().from(schema.clients).where(inArray(schema.clients.id, clientIds)) : [];

    const formatted = data.map((quoteData: any) => {
      const client = clients.find(c => c.id === quoteData.clientId) || null;
      return { quote: quoteData, client };
    });

    return c.json({ data: formatted, total, page, limit });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

quotesRoutes.post('/', requireAdmin, async (c) => {
  const admin = c.get('user');
  const data = await c.req.json();
  const db = c.get('db');

  try {
    const quoteNumber = await generateQuoteNumber(db, admin.tenantId);
    
    const subtotal = calculateSubtotal(data.items);
    const tax = data.tax || '0.00';
    const discount = data.discount || '0.00';
    const total = calculateTotal(subtotal, tax, discount);

    const quotationId = await db.transaction(async (tx: any) => {
      const [newQuote] = await tx.insert(schema.quotations).values({
        tenantId: admin.tenantId,
        clientId: data.clientId,
        projectId: data.projectId || null,
        quoteNumber: quoteNumber,
        issueDate: new Date().toISOString(),
        validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        subtotal: subtotal,
        tax: tax,
        discount: discount,
        total: total,
        currency: data.currency || 'LKR',
        exchangeRate: data.exchangeRate || '1.000000',
        status: 'draft',
        notes: data.notes,
        terms: data.terms,
        createdBy: parseInt(admin.sub as string),
      }).returning({ id: schema.quotations.id });

      if (data.items && data.items.length > 0) {
        await tx.insert(schema.quotationItems).values(data.items.map((item: any) => ({
          quotationId: newQuote.id,
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          amount: calculateLineItemAmount(item.quantity, item.unitPrice),
        })));
      }

      await tx.insert(schema.activityLogs).values({
        tenantId: admin.tenantId,
        userId: parseInt(admin.sub as string),
        entityType: 'quote',
        entityId: newQuote.id,
        action: `Quotation ${quoteNumber} created.`,
      });

      return newQuote.id;
    });

    return c.json({ success: true, quoteId: quotationId });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

quotesRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const quoteId = parseInt(c.req.param('id'));
  const db = c.get('db');

  try {
    const [quoteData] = await db.select().from(schema.quotations).where(
      and(eq(schema.quotations.id, quoteId), isNull(schema.quotations.deletedAt))
    ).limit(1);
    
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
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

quotesRoutes.post('/:id/send', requireAdmin, async (c) => {
  const admin = c.get('user');
  const quoteId = parseInt(c.req.param('id'));
  const db = c.get('db');
  const resend = new Resend(c.env.RESEND_API_KEY || 're_dummy');
  
  try {
    const [quoteData] = await db.select().from(schema.quotations).where(
      and(eq(schema.quotations.id, quoteId), isNull(schema.quotations.deletedAt))
    ).limit(1);
    
    if (!quoteData) return c.json({ error: 'Quote not found' }, 404);
    if (!canTransitionQuote(quoteData.status as QuoteStatus, 'sent')) {
      return c.json({ error: 'Invalid status transition' }, 400);
    }
    
    const [client] = quoteData.clientId ? await db.select().from(schema.clients).where(eq(schema.clients.id, quoteData.clientId)).limit(1) : [null];
    const clientEmail = client?.email;
    
    if (!clientEmail) return c.json({ error: 'Client has no email address' }, 400);

    // Get currency symbol from settings (Fallback to Rs.)
    const [currencySetting] = await db.select().from(schema.settings)
      .where(and(eq(schema.settings.tenantId, admin.tenantId), eq(schema.settings.settingKey, 'currencySymbol'))).limit(1);
    const currencySymbol = currencySetting?.settingValue || 'Rs.';

    await resend.emails.send({
      from: 'Shatter DAMS Sales <hello@mailer.meetshatter.com>',
      to: [clientEmail],
      subject: `Quotation ${quoteData.quoteNumber} from Shatter`,
      html: `
        <h2>Quotation ${quoteData.quoteNumber}</h2>
        <p>Dear ${client?.contactPerson || client?.companyName},</p>
        <p>We have prepared a new quotation for you for the amount of <strong>${currencySymbol}${quoteData.total}</strong>.</p>
        <p>Please log in to your portal to review and accept the quotation.</p>
        <p><strong>Portal Login:</strong> https://client.meetshatter.com/login</p>
        <br/>
        <p>Thank you!</p>
      `,
    });

    await db.transaction(async (tx: any) => {
      await tx.update(schema.quotations).set({ status: 'sent' }).where(eq(schema.quotations.id, quoteId));
      await tx.insert(schema.activityLogs).values({
        tenantId: admin.tenantId,
        userId: parseInt(admin.sub as string),
        entityType: 'quote',
        entityId: quoteId,
        action: `Quotation ${quoteData.quoteNumber} sent to client.`,
      });
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

quotesRoutes.patch('/:id/accept', async (c) => {
  const user = c.get('user');
  const quoteId = parseInt(c.req.param('id'));
  const db = c.get('db');
  const reqBody = await c.req.json().catch(() => ({}));

  try {
    const [quoteData] = await db.select().from(schema.quotations).where(
      and(eq(schema.quotations.id, quoteId), isNull(schema.quotations.deletedAt))
    ).limit(1);
    
    if (!quoteData) return c.json({ error: 'Quote not found' }, 404);
    
    const newStatus = reqBody.status === 'rejected' ? 'rejected' : 'accepted';

    if (!canTransitionQuote(quoteData.status as QuoteStatus, newStatus)) {
      return c.json({ error: 'Invalid status transition' }, 400);
    }

    await db.transaction(async (tx: any) => {
      await tx.update(schema.quotations).set({ status: newStatus }).where(eq(schema.quotations.id, quoteId));
      await tx.insert(schema.activityLogs).values({
        tenantId: user.tenantId,
        userId: parseInt(user.sub as string),
        entityType: 'quote',
        entityId: quoteId,
        action: `Quotation ${quoteData.quoteNumber} ${newStatus} by client.`,
      });
      // TODO: Add Resend notification to admin
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

quotesRoutes.put('/:id', requireAdmin, async (c) => {
  const admin = c.get('user');
  const quoteId = parseInt(c.req.param('id'));
  const data = await c.req.json();
  const db = c.get('db');

  try {
    const [quoteData] = await db.select().from(schema.quotations).where(
      and(eq(schema.quotations.id, quoteId), isNull(schema.quotations.deletedAt))
    ).limit(1);
    
    if (!quoteData) return c.json({ error: 'Quote not found' }, 404);
    
    const targetStatus = data.status || quoteData.status;
    if (!canTransitionQuote(quoteData.status as QuoteStatus, targetStatus as QuoteStatus)) {
      return c.json({ error: 'Invalid status transition' }, 400);
    }

    const subtotal = calculateSubtotal(data.items);
    const tax = data.tax || '0.00';
    const discount = data.discount || '0.00';
    const total = calculateTotal(subtotal, tax, discount);

    await db.transaction(async (tx: any) => {
      await tx.update(schema.quotations).set({
        clientId: data.clientId,
        projectId: data.projectId || null,
        validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : undefined,
        subtotal: subtotal,
        tax: tax,
        discount: discount,
        total: total,
        currency: data.currency || 'LKR',
        exchangeRate: data.exchangeRate || '1.000000',
        status: targetStatus,
        notes: data.notes,
        terms: data.terms,
        updatedAt: new Date().toISOString()
      }).where(and(eq(schema.quotations.id, quoteId), eq(schema.quotations.tenantId, admin.tenantId)));

      await tx.delete(schema.quotationItems).where(eq(schema.quotationItems.quotationId, quoteId));
      
      if (data.items && data.items.length > 0) {
        await tx.insert(schema.quotationItems).values(data.items.map((item: any) => ({
          quotationId: quoteId,
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          amount: calculateLineItemAmount(item.quantity, item.unitPrice),
        })));
      }
      
      await tx.insert(schema.activityLogs).values({
        tenantId: admin.tenantId,
        userId: parseInt(admin.sub as string),
        entityType: 'quote',
        entityId: quoteId,
        action: `Quotation ${quoteData.quoteNumber} updated.`,
      });
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

quotesRoutes.post('/:id/convert-to-invoice', requireAdmin, async (c) => {
  const admin = c.get('user');
  const quoteId = parseInt(c.req.param('id'));
  const db = c.get('db');
  
  try {
    const [quote] = await db.select().from(schema.quotations).where(
      and(eq(schema.quotations.id, quoteId), eq(schema.quotations.tenantId, admin.tenantId), isNull(schema.quotations.deletedAt))
    ).limit(1);
    
    if (!quote) return c.json({ error: 'Quote not found' }, 404);
    if (quote.status !== 'accepted') return c.json({ error: 'Only accepted quotes can be converted' }, 400);
    if (quote.convertedToInvoiceId) return c.json({ error: 'Quote already converted' }, 400);
    
    const items = await db.select().from(schema.quotationItems).where(eq(schema.quotationItems.quotationId, quoteId));
    
    // Generate Invoice Number
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const [latestInv] = await db.select({ invoiceNumber: schema.invoices.invoiceNumber })
      .from(schema.invoices)
      .where(eq(schema.invoices.tenantId, admin.tenantId))
      .orderBy(desc(schema.invoices.id))
      .limit(1);

    let sequence = 1;
    if (latestInv && latestInv.invoiceNumber.startsWith(prefix)) {
      const lastSeq = parseInt(latestInv.invoiceNumber.split('-')[2], 10);
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }
    const invNumber = `${prefix}${sequence.toString().padStart(4, '0')}`;
    
    // Fetch settings for currency
    const [currencySetting] = await db.select().from(schema.settings)
      .where(and(eq(schema.settings.tenantId, admin.tenantId), eq(schema.settings.settingKey, 'currency'))).limit(1);
    const currency = currencySetting?.settingValue || 'LKR';

    const invoiceId = await db.transaction(async (tx: any) => {
      const [newInvoice] = await tx.insert(schema.invoices).values({
        tenantId: admin.tenantId,
        clientId: quote.clientId,
        projectId: quote.projectId,
        invoiceNumber: invNumber,
        title: quote.title,
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 14*24*60*60*1000).toISOString(),
        subtotal: quote.subtotal,
        tax: quote.tax,
        discount: quote.discount,
        total: quote.total,
        currency: quote.currency || currency,
        exchangeRate: quote.exchangeRate || '1.000000',
        status: 'draft',
        notes: quote.notes,
        terms: quote.terms,
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
      
      await tx.update(schema.quotations).set({ convertedToInvoiceId: newInvoice.id }).where(eq(schema.quotations.id, quoteId));
      
      // Queue notification
      await tx.insert(schema.notificationQueue).values({
        tenantId: admin.tenantId,
        type: 'invoice_send',
        entityType: 'invoice',
        entityId: newInvoice.id,
        title: `Invoice ${invNumber} ready to send`,
        description: `Generated from Quote ${quote.quoteNumber}. Ready for review.`,
        status: 'pending',
        createdBy: parseInt(admin.sub as string),
      });
      
      await tx.insert(schema.activityLogs).values({
        tenantId: admin.tenantId,
        userId: parseInt(admin.sub as string),
        entityType: 'quote',
        entityId: quoteId,
        action: `Quotation ${quote.quoteNumber} converted to Invoice ${invNumber}.`,
      });
      
      return newInvoice.id;
    });

    return c.json({ success: true, invoiceId });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

quotesRoutes.delete('/:id', requireAdmin, async (c) => {
  const admin = c.get('user');
  const quoteId = parseInt(c.req.param('id'));
  const db = c.get('db');
  
  try {
    await db.transaction(async (tx: any) => {
      await tx.update(schema.quotations).set({ deletedAt: new Date().toISOString() })
        .where(and(eq(schema.quotations.id, quoteId), eq(schema.quotations.tenantId, admin.tenantId)));
        
      await tx.insert(schema.activityLogs).values({
        tenantId: admin.tenantId,
        userId: parseInt(admin.sub as string),
        entityType: 'quote',
        entityId: quoteId,
        action: `Quotation deleted.`,
      });
    });
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

quotesRoutes.post('/:id/duplicate', requireAdmin, async (c) => {
  const admin = c.get('user');
  const quoteId = parseInt(c.req.param('id'));
  const db = c.get('db');
  
  try {
    const [quote] = await db.select().from(schema.quotations).where(
      and(eq(schema.quotations.id, quoteId), eq(schema.quotations.tenantId, admin.tenantId), isNull(schema.quotations.deletedAt))
    ).limit(1);
    
    if (!quote) return c.json({ error: 'Quote not found' }, 404);
    
    const items = await db.select().from(schema.quotationItems).where(eq(schema.quotationItems.quotationId, quoteId));
    
    // Generate new Quote Number
    const quoteNumber = await generateQuoteNumber(db, admin.tenantId);
    
    const newQuoteId = await db.transaction(async (tx: any) => {
      const [newQuote] = await tx.insert(schema.quotations).values({
        tenantId: admin.tenantId,
        clientId: quote.clientId,
        projectId: quote.projectId,
        quoteNumber: quoteNumber,
        title: quote.title,
        issueDate: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        subtotal: quote.subtotal,
        tax: quote.tax,
        discount: quote.discount,
        total: quote.total,
        currency: quote.currency,
        exchangeRate: quote.exchangeRate,
        status: 'draft',
        notes: quote.notes,
        terms: quote.terms,
        createdBy: parseInt(admin.sub as string),
      }).returning({ id: schema.quotations.id });
      
      if (items && items.length > 0) {
        await tx.insert(schema.quotationItems).values(items.map((item: any) => ({
          quotationId: newQuote.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })));
      }
      
      await tx.insert(schema.activityLogs).values({
        tenantId: admin.tenantId,
        userId: parseInt(admin.sub as string),
        entityType: 'quote',
        entityId: newQuote.id,
        action: `Quotation duplicated from ${quote.quoteNumber}.`,
      });
      
      return newQuote.id;
    });

    return c.json({ success: true, quoteId: newQuoteId });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default quotesRoutes;
