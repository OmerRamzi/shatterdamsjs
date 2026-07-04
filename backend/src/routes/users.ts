import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import { createClient } from '@supabase/supabase-js';

const router = new Hono<{ Bindings: { SUPABASE_URL: string; SUPABASE_SERVICE_KEY: string }, Variables: { user: any } }>();

router.use('*', requireAuth);

router.get('/', async (c) => {
  const user = c.get('user');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  // Fetch all users
  const { data: allUsers, error: usersError } = await supabase
    .from('users')
    .select('*')
    .eq('tenantId', user.tenantId);

  if (usersError) {
    return c.json({ error: usersError.message }, 500);
  }

  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*');

  if (rolesError) {
    return c.json({ error: rolesError.message }, 500);
  }

  const usersWithRoles = (allUsers || []).map(u => ({
    ...u,
    role: (roles || []).find(r => r.userId === u.id)?.role || 'unknown'
  }));

  return c.json(usersWithRoles);
});

export default router;
