import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const invoicesRoutes = new Hono<{ Bindings: { SUPABASE_URL: string, SUPABASE_ANON_KEY: string, RESEND_API_KEY: string }, Variables: { user: any } }>();

invoicesRoutes.use('*', requireAuth);

async function generateInvoiceNumber(supabase: any, tenantId: number) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  const { data: latest } = await supabase.from('invoices').select('invoice_number').eq('tenant_id', tenantId).order('id', { ascending: false }).limit(1);

  let sequence = 1;
  if (latest && latest.length > 0 && latest[0].invoiceNumber.startsWith(prefix)) {
    const lastSeq = parseInt(latest[0].invoiceNumber.split('-')[2], 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }
  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

invoicesRoutes.get('/', requireAdmin, async (c) => {
  const user = c.get('user');
  const clientId = c.req.query('clientId');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  let query = supabase.from('invoices').select('*, client:clients(*), project:projects(*)').eq('tenant_id', user.tenantId);
  if (clientId) {
    query = query.eq('client_id', clientId);
  }
  
  const { data } = await query.order('created_at', { ascending: false });
    
  const formatted = (data || []).map((row: any) => {
    const { client, project, ...invoiceData } = row;
    return { invoice: invoiceData, client, project };
  });
  return c.json(formatted);
});

invoicesRoutes.post('/', requireAdmin, async (c) => {
  const admin = c.get('user');
  const data = await c.req.json();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const invoiceNumber = await generateInvoiceNumber(supabase, admin.tenantId);
  const subtotal = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);

  const { data: newInvoice, error: invError } = await supabase.from('invoices').insert({
    tenant_id: admin.tenantId,
    client_id: data.clientId,
    project_id: data.projectId,
    invoice_number: invoiceNumber,
    issue_date: new Date().toISOString(),
    due_date: data.dueDate ? new Date(data.dueDate).toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    subtotal: subtotal.toString(),
    tax: '0',
    total: subtotal.toString(),
    status: 'draft',
    notes: data.notes,
    created_by: parseInt(admin.sub as string),
  }).select('id').single();

  if (invError || !newInvoice) return c.json({ error: invError?.message || 'Failed to create invoice' }, 500);
  const invoiceId = newInvoice.id;

  for (const item of data.items) {
    await supabase.from('invoice_items').insert({
      invoice_id: invoiceId,
      description: item.description,
      quantity: item.quantity.toString(),
      unit_price: item.unitPrice.toString(),
      amount: (item.quantity * item.unitPrice).toString(),
    });
  }

  await supabase.from('activity_logs').insert({
    tenant_id: admin.tenantId,
    user_id: parseInt(admin.sub as string),
    action: `Invoice ${invoiceNumber} created.`,
  });

  return c.json({ success: true, invoiceId });
});

invoicesRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const invoiceId = c.req.param('id');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const { data: invoiceList, error } = await supabase.from('invoices').select('*, client:clients(*), project:projects(*)').eq('id', invoiceId).limit(1);
  if (error || !invoiceList || invoiceList.length === 0) return c.json({ error: 'Invoice not found' }, 404);
  const row = invoiceList[0] as any;
  
  if (row.tenant_id !== user.tenantId) return c.json({ error: 'Unauthorized' }, 403);

  if (user.role === 'client') {
    const { data: clientRecord } = await supabase.from('clients').select('*').eq('user_id', user.sub).limit(1);
    if (!clientRecord || clientRecord.length === 0 || row.client_id !== clientRecord[0].id) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
  }

  const { data: items } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId);
  const { client, project, ...invoiceData } = row;
  
  return c.json({
    invoice: invoiceData,
    client: client,
    project: project,
    items: items || []
  });
});

invoicesRoutes.post('/:id/send', requireAdmin, async (c) => {
  const admin = c.get('user');
  const invoiceId = c.req.param('id');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  const resend = new Resend(c.env.RESEND_API_KEY || 're_dummy');
  
  const { data: invoiceList } = await supabase.from('invoices').select('*, client:clients(*)').eq('id', invoiceId).limit(1);
  if (!invoiceList || invoiceList.length === 0) return c.json({ error: 'Invoice not found' }, 404);
  const row = invoiceList[0] as any;
  const clientEmail = row.client?.email;
  
  if (!clientEmail) return c.json({ error: 'Client has no email address' }, 400);

  await resend.emails.send({
    from: 'Shatter DAMS Billing <hello@mailer.meetshatter.com>',
    to: [clientEmail],
    subject: `Invoice ${row.invoice_number} from Shatter`,
    html: `
      <h2>Invoice ${row.invoice_number}</h2>
      <p>Dear ${row.client?.contactPerson || row.client?.companyName},</p>
      <p>A new invoice has been generated for your account for the amount of <strong>$${row.total}</strong>.</p>
      <p>You can view and download your invoice securely by logging into your client portal.</p>
      <p><strong>Portal Login:</strong> https://client.meetshatter.com/login</p>
      <br/>
      <p>Thank you for your business!</p>
    `,
  });

  await supabase.from('invoices').update({ status: 'sent' }).eq('id', invoiceId);
  await supabase.from('activity_logs').insert({
    tenant_id: admin.tenantId,
    user_id: parseInt(admin.sub as string),
    action: `Invoice ${row.invoice_number} sent to client.`,
  });

  return c.json({ success: true });
});

invoicesRoutes.patch('/:id/paid', requireAdmin, async (c) => {
  const admin = c.get('user');
  const invoiceId = c.req.param('id');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const { data: invoiceList } = await supabase.from('invoices').select('*').eq('id', invoiceId).limit(1);
  if (!invoiceList || invoiceList.length === 0) return c.json({ error: 'Invoice not found' }, 404);

  await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoiceId);
  await supabase.from('activity_logs').insert({
    tenant_id: admin.tenantId,
    user_id: parseInt(admin.sub as string),
    action: `Invoice ${invoiceList[0].invoice_number} marked as paid.`,
  });

  return c.json({ success: true });
});

invoicesRoutes.put('/:id', requireAdmin, async (c) => {
  const admin = c.get('user');
  const invoiceId = c.req.param('id');
  const data = await c.req.json();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const subtotal = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);

  const { error: invError } = await supabase.from('invoices').update({
    client_id: data.clientId,
    project_id: data.projectId,
    due_date: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
    subtotal: subtotal.toString(),
    total: subtotal.toString(),
    status: data.status || 'draft',
    notes: data.notes,
  }).eq('id', invoiceId).eq('tenant_id', admin.tenantId);

  if (invError) return c.json({ error: invError.message || 'Failed to update invoice' }, 500);

  // Re-create items
  for (const item of data.items) {
    await supabase.from('invoice_items').insert({
      invoice_id: invoiceId,
      description: item.description,
      quantity: item.quantity.toString(),
      unit_price: item.unitPrice.toString(),
      amount: (item.quantity * item.unitPrice).toString(),
    });
  }

  return c.json({ success: true });
});

invoicesRoutes.delete('/:id', requireAdmin, async (c) => {
  const admin = c.get('user');
  const invoiceId = c.req.param('id');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  // Note: invoice_items will automatically cascade delete if set up in schema. If not, delete them first.
  await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);

  const { error } = await supabase.from('invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('tenant_id', admin.tenantId);
    
  if (error) return c.json({ error: error.message }, 500);

  return c.json({ success: true });
});

export default invoicesRoutes;
