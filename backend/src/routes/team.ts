import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const teamRoutes = new Hono<{ Bindings: { SUPABASE_URL: string, SUPABASE_ANON_KEY: string }, Variables: { user: any } }>();

teamRoutes.use('*', requireAuth, requireAdmin);

teamRoutes.get('/', async (c) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { data: allRoles } = await supabase.from('user_roles').select('*');
  const roles = allRoles || [];

  const teamUserIds = roles
    .filter(r => r.role === 'employee' || r.role === 'freelancer' || r.role === 'administrator')
    .map(r => r.userId);

  if (teamUserIds.length === 0) return c.json([]);

  const { data: team } = await supabase.from('users').select('*').in('id', teamUserIds);
  
  const formatted = (team || []).map(u => {
    const role = roles.find(r => r.userId === u.id)?.role;
    return { ...u, role };
  });

  return c.json(formatted);
});

teamRoutes.post('/', async (c) => {
  const admin = c.get('user');
  const data = await c.req.json();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const defaultPassword = 'Team@123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const { data: newUser, error: userError } = await supabase.from('users').insert({
    tenantId: admin.tenantId,
    email: data.email,
    passwordHash,
    displayName: data.displayName,
    phone: data.phone,
    preferredLocale: 'en',
  }).select('id').single();

  if (userError || !newUser) return c.json({ error: userError?.message || 'Failed to create user' }, 500);
  const userId = newUser.id;

  await supabase.from('user_roles').insert({ userId, role: data.role });

  await supabase.from('activity_logs').insert({
    tenantId: admin.tenantId,
    userId: parseInt(admin.sub as string),
    action: `Team member '${data.displayName}' added as ${data.role}.`,
  });

  return c.json({ success: true });
});

export default teamRoutes;
