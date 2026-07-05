import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import { createClient } from '@supabase/supabase-js';

const tasksRoutes = new Hono<{ Bindings: { SUPABASE_URL: string, SUPABASE_ANON_KEY: string }, Variables: { user: any } }>();

tasksRoutes.use('*', requireAuth);

tasksRoutes.get('/', async (c) => {
  const user = c.get('user');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { data, error } = await supabase.from('tasks').select('*').eq('tenant_id', user.tenantId);
  if (error) return c.json({ error: error.message }, 500);
  
  return c.json(data || []);
});

tasksRoutes.post('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const { error } = await supabase.from('tasks').insert({
    tenant_id: user.tenantId,
    project_id: data.projectId,
    title: data.title,
    status: data.status || 'todo',
    due_date: data.dueDate,
    assignee_id: data.assigneeId
  });

  if (error) return c.json({ error: error.message }, 500);

  return c.json({ success: true });
});

export default tasksRoutes;
