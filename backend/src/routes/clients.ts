import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  RESEND_API_KEY: string;
};

const clientsRoutes = new Hono<{ Bindings: Bindings, Variables: { user: any } }>();

clientsRoutes.use('*', requireAuth, requireAdmin);

clientsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('tenant_id', user.tenantId);
    
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data || []);
});

clientsRoutes.post('/', async (c) => {
  const admin = c.get('user');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  const data = await c.req.json();

  const { error: insertError } = await supabase.from('clients').insert({
    tenantId: admin.tenantId,
    companyName: data.companyName,
    contactPerson: data.contactPerson,
    email: data.email,
    phone: data.phone,
    address: data.address,
    city: data.city,
    country: data.country || 'Sri Lanka',
    status: 'active',
  });
  
  if (insertError) return c.json({ error: insertError.message }, 500);

  await supabase.from('activity_logs').insert({
    tenantId: admin.tenantId,
    userId: parseInt(admin.sub as string),
    action: `Client '${data.companyName}' added (Unactivated).`,
  });

  return c.json({ success: true });
});

clientsRoutes.post('/:id/activate', async (c) => {
  const admin = c.get('user');
  const clientId = c.req.param('id');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  const resend = new Resend(c.env.RESEND_API_KEY || 're_dummy');

  const { data: clientList, error: getError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .limit(1);

  if (getError || !clientList || clientList.length === 0) return c.json({ error: 'Client not found' }, 404);
  const client = clientList[0];

  if (client.userId) return c.json({ error: 'Client is already activated' }, 400);

  const randomPassword = Math.random().toString(36).slice(-8) + 'Aa1@';
  const passwordHash = await bcrypt.hash(randomPassword, 10);

  const { data: newUser, error: userError } = await supabase.from('users').insert({
    tenantId: admin.tenantId,
    email: client.email,
    passwordHash,
    displayName: client.contactPerson || client.companyName,
    preferredLocale: 'en',
  }).select('id').single();
  
  if (userError || !newUser) return c.json({ error: userError?.message || 'Failed to create user' }, 500);

  const userId = newUser.id;

  await supabase.from('user_roles').insert({ userId, role: 'client' });
  await supabase.from('clients').update({ userId }).eq('id', clientId);

  await resend.emails.send({
    from: 'Shatter DAMS <hello@mailer.meetshatter.com>',
    to: [client.email],
    subject: 'Your Shatter DAMS Client Portal Access',
    html: `
      <h2>Welcome to your Client Portal</h2>
      <p>Your account has been activated. You can now log in to view your projects and files.</p>
      <p><strong>Login URL:</strong> https://client.meetshatter.com/login</p>
      <p><strong>Email:</strong> ${client.email}</p>
      <p><strong>Password:</strong> ${randomPassword}</p>
      <br/>
      <p>Please change your password upon logging in.</p>
    `,
  });

  await supabase.from('activity_logs').insert({
    tenantId: admin.tenantId,
    userId: parseInt(admin.sub as string),
    action: `Client '${client.companyName}' account activated and credentials emailed.`,
  });

  return c.json({ success: true });
});

clientsRoutes.delete('/:id', async (c) => {
  const admin = c.get('user');
  const clientId = c.req.param('id');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { error } = await supabase.from('clients').delete().eq('id', clientId);
  if (error) return c.json({ error: error.message }, 500);
  
  await supabase.from('activity_logs').insert({
    tenantId: admin.tenantId,
    userId: parseInt(admin.sub as string),
    action: `Client ID ${clientId} deleted.`,
  });

  return c.json({ success: true });
});

export default clientsRoutes;
