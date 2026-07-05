import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import { createClient } from '@supabase/supabase-js';

const timesheetsRoutes = new Hono<{ Bindings: { SUPABASE_URL: string, SUPABASE_ANON_KEY: string }, Variables: { user: any } }>();

timesheetsRoutes.use('*', requireAuth);

timesheetsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { data, error } = await supabase.from('timesheets').select('*').eq('tenant_id', user.tenantId);
  if (error) return c.json({ error: error.message }, 500);
  
  return c.json(data || []);
});

timesheetsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const { error } = await supabase.from('timesheets').insert({
    tenant_id: user.tenantId,
    user_id: user.sub,
    project_id: data.projectId,
    date: data.date,
    hours: data.hours,
    description: data.description
  });

  if (error) return c.json({ error: error.message }, 500);

  return c.json({ success: true });
});

export default timesheetsRoutes;
