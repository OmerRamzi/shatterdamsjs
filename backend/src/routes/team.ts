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

teamRoutes.put('/:id', async (c) => {
  const admin = c.get('user');
  const userIdToUpdate = parseInt(c.req.param('id'));
  const data = await c.req.json();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  // First, verify the user belongs to the tenant
  const { data: existingUser } = await supabase.from('users')
    .select('id')
    .eq('id', userIdToUpdate)
    .eq('tenant_id', admin.tenantId)
    .single();

  if (!existingUser) return c.json({ error: 'User not found or unauthorized' }, 404);

  // Update user details
  const { error: userError } = await supabase.from('users')
    .update({
      displayName: data.displayName,
      phone: data.phone
    })
    .eq('id', userIdToUpdate);

  if (userError) return c.json({ error: userError.message }, 500);

  // Update role if provided
  if (data.role) {
    await supabase.from('user_roles')
      .update({ role: data.role })
      .eq('user_id', userIdToUpdate);
  }

  await supabase.from('activity_logs').insert({
    tenantId: admin.tenantId,
    userId: parseInt(admin.sub as string),
    action: `Team member '${data.displayName || userIdToUpdate}' updated.`,
  });

  return c.json({ success: true });
});

teamRoutes.delete('/:id', async (c) => {
  const admin = c.get('user');
  const userIdToDelete = parseInt(c.req.param('id'));
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  // Verify user belongs to tenant
  const { data: existingUser } = await supabase.from('users')
    .select('id')
    .eq('id', userIdToDelete)
    .eq('tenant_id', admin.tenantId)
    .single();

  if (!existingUser) return c.json({ error: 'User not found or unauthorized' }, 404);

  // Delete user (cascade should handle user_roles and activity logs ideally, but if not, delete user_roles first)
  await supabase.from('user_roles').delete().eq('user_id', userIdToDelete);
  const { error } = await supabase.from('users').delete().eq('id', userIdToDelete);
    
  if (error) return c.json({ error: error.message }, 500);
  
  await supabase.from('activity_logs').insert({
    tenantId: admin.tenantId,
    userId: parseInt(admin.sub as string),
    action: `Team member ID ${userIdToDelete} deleted.`,
  });

  return c.json({ success: true });
});

export default teamRoutes;
