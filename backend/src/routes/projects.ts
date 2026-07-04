import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import { createClient } from '@supabase/supabase-js';

const projectsRoutes = new Hono<{ Bindings: { SUPABASE_URL: string, SUPABASE_ANON_KEY: string }, Variables: { user: any } }>();

projectsRoutes.use('*', requireAuth);

projectsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { data, error } = await supabase.from('projects').select('*').eq('tenant_id', user.tenantId);
  if (error) return c.json({ error: error.message }, 500);
  
  return c.json(data || []);
});

projectsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const { error } = await supabase.from('projects').insert({
    tenantId: user.tenantId,
    clientId: data.clientId,
    title: data.title,
    description: data.description,
    budget: data.budget,
    deadline: data.deadline,
    createdBy: parseInt(user.sub as string),
    status: 'active',
    priority: 'medium',
  });

  if (error) return c.json({ error: error.message }, 500);

  await supabase.from('activity_logs').insert({
    tenantId: user.tenantId,
    userId: parseInt(user.sub as string),
    action: `Project '${data.title}' created.`,
  });

  return c.json({ success: true });
});

export default projectsRoutes;
