import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const quotesRoutes = new Hono<{ Bindings: { SUPABASE_URL: string, SUPABASE_ANON_KEY: string, RESEND_API_KEY: string }, Variables: { user: any } }>();

quotesRoutes.use('*', requireAuth);

async function generateQuoteNumber(supabase: any, tenantId: number) {
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;
  
  const { data: latest } = await supabase.from('quotations').select('quoteNumber').eq('tenantId', tenantId).order('id', { ascending: false }).limit(1);

  let sequence = 1;
  if (latest && latest.length > 0 && latest[0].quoteNumber.startsWith(prefix)) {
    const lastSeq = parseInt(latest[0].quoteNumber.split('-')[2], 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }
  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

quotesRoutes.get('/', requireAdmin, async (c) => {
  const user = c.get('user');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { data } = await supabase.from('quotations').select('*, client:clients(*)').eq('tenantId', user.tenantId).order('createdAt', { ascending: false });
    
  const formatted = (data || []).map((row: any) => {
    const { client, ...quoteData } = row;
    return { quote: quoteData, client: client };
  });
  return c.json(formatted);
});

quotesRoutes.post('/', requireAdmin, async (c) => {
  const admin = c.get('user');
  const data = await c.req.json();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const quoteNumber = await generateQuoteNumber(supabase, admin.tenantId);
  const subtotal = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);

  const { data: newQuote, error: quoteError } = await supabase.from('quotations').insert({
    tenantId: admin.tenantId,
    clientId: data.clientId,
    quoteNumber,
    issueDate: new Date().toISOString(),
    subtotal: subtotal.toString(),
    tax: '0',
    total: subtotal.toString(),
    status: 'draft',
    validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    notes: data.notes,
    createdBy: parseInt(admin.sub as string),
  }).select('id').single();

  if (quoteError || !newQuote) return c.json({ error: quoteError?.message || 'Failed to create quote' }, 500);
  const quotationId = newQuote.id;

  for (const item of data.items) {
    await supabase.from('quotation_items').insert({
      quotationId,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      amount: (item.quantity * item.unitPrice).toString(),
    });
  }

  await supabase.from('activity_logs').insert({
    tenantId: admin.tenantId,
    userId: parseInt(admin.sub as string),
    action: `Quotation ${quoteNumber} created.`,
  });

  return c.json({ success: true, quoteId: quotationId });
});

quotesRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const quoteId = c.req.param('id');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const { data: quoteList, error } = await supabase.from('quotations').select('*, client:clients(*)').eq('id', quoteId).limit(1);
  if (error || !quoteList || quoteList.length === 0) return c.json({ error: 'Quote not found' }, 404);
  const row = quoteList[0] as any;
  
  if (row.tenantId !== user.tenantId) return c.json({ error: 'Unauthorized' }, 403);

  if (user.role === 'client') {
    const { data: clientRecord } = await supabase.from('clients').select('*').eq('userId', user.sub).limit(1);
    if (!clientRecord || clientRecord.length === 0 || row.clientId !== clientRecord[0].id) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
  }

  const { data: items } = await supabase.from('quotation_items').select('*').eq('quotationId', quoteId);
  const { client, ...quoteData } = row;
  
  return c.json({
    quote: quoteData,
    client: client,
    items: items || []
  });
});

quotesRoutes.post('/:id/send', requireAdmin, async (c) => {
  const admin = c.get('user');
  const quoteId = c.req.param('id');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  const resend = new Resend(c.env.RESEND_API_KEY || 're_dummy');
  
  const { data: quoteList } = await supabase.from('quotations').select('*, client:clients(*)').eq('id', quoteId).limit(1);
  if (!quoteList || quoteList.length === 0) return c.json({ error: 'Quote not found' }, 404);
  const row = quoteList[0] as any;
  const clientEmail = row.client?.email;
  
  if (!clientEmail) return c.json({ error: 'Client has no email address' }, 400);

  await resend.emails.send({
    from: 'Shatter DAMS Sales <hello@mailer.meetshatter.com>',
    to: [clientEmail],
    subject: `Quotation ${row.quoteNumber} from Shatter`,
    html: `
      <h2>Quotation ${row.quoteNumber}</h2>
      <p>Dear ${row.client?.contactPerson || row.client?.companyName},</p>
      <p>We have prepared a new quotation for you for the amount of <strong>$${row.total}</strong>.</p>
      <p>Please log in to your portal to review and accept the quotation.</p>
      <p><strong>Portal Login:</strong> https://client.meetshatter.com/login</p>
      <br/>
      <p>Thank you!</p>
    `,
  });

  await supabase.from('quotations').update({ status: 'sent' }).eq('id', quoteId);
  await supabase.from('activity_logs').insert({
    tenantId: admin.tenantId,
    userId: parseInt(admin.sub as string),
    action: `Quotation ${row.quoteNumber} sent to client.`,
  });

  return c.json({ success: true });
});

quotesRoutes.patch('/:id/accept', async (c) => {
  const user = c.get('user');
  const quoteId = c.req.param('id');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const { data: quoteList } = await supabase.from('quotations').select('*').eq('id', quoteId).limit(1);
  if (!quoteList || quoteList.length === 0) return c.json({ error: 'Quote not found' }, 404);

  await supabase.from('quotations').update({ status: 'accepted' }).eq('id', quoteId);
  await supabase.from('activity_logs').insert({
    tenantId: user.tenantId,
    userId: parseInt(user.sub as string),
    action: `Quotation ${quoteList[0].quoteNumber} accepted.`,
  });

  return c.json({ success: true });
});

export default quotesRoutes;
