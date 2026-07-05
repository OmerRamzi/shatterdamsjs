import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import { createClient } from '@supabase/supabase-js';

const settingsRoutes = new Hono<{ Bindings: { SUPABASE_URL: string, SUPABASE_ANON_KEY: string }, Variables: { user: any } }>();

settingsRoutes.use('*', requireAuth);

settingsRoutes.get('/', async (c) => {
  const user = c.get('user');
  if (user.role !== 'administrator') return c.json({ error: 'Unauthorized' }, 403);
  
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { data, error } = await supabase.from('organizations').select('settings').eq('id', user.tenantId).limit(1);
  if (error) return c.json({ error: error.message }, 500);
  
  return c.json(data?.[0]?.settings || {});
});

settingsRoutes.put('/', async (c) => {
  const user = c.get('user');
  if (user.role !== 'administrator') return c.json({ error: 'Unauthorized' }, 403);
  const data = await c.req.json();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const { error } = await supabase.from('organizations').update({ settings: data }).eq('id', user.tenantId);

  if (error) return c.json({ error: error.message }, 500);

  return c.json({ success: true });
});

export default settingsRoutes;
