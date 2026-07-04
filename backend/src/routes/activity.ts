import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import { createClient } from '@supabase/supabase-js';

const activityRoutes = new Hono<{ Bindings: { SUPABASE_URL: string, SUPABASE_ANON_KEY: string }, Variables: { user: any } }>();

activityRoutes.use('*', requireAuth);

activityRoutes.get('/', async (c) => {
  const user = c.get('user');
  const limit = parseInt(c.req.query('limit') || '10', 10);
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const { data, error } = await supabase
    .from("activity_logs")
    .select(`
      id,
      action,
      createdAt,
      user:users (
        id,
        displayName
      )
    `)
    .eq("tenant_id", user.tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return c.json({ error: error.message }, 500);

  const formatted = (data || []).map(row => ({
    id: row.id,
    action: row.action,
    createdAt: row.createdAt,
    user: Array.isArray(row.user) ? row.user[0] : row.user
  }));

  return c.json(formatted);
});

export default activityRoutes;
