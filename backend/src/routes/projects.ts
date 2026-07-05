import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import { createClient } from '@supabase/supabase-js';

const projectsRoutes = new Hono<{ Bindings: { SUPABASE_URL: string, SUPABASE_ANON_KEY: string }, Variables: { user: any } }>();

projectsRoutes.use('*', requireAuth);

projectsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const clientId = c.req.query('clientId');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  let query = supabase.from('projects').select('*').eq('tenant_id', user.tenantId);
  if (clientId) {
    query = query.eq('client_id', clientId);
  }
  
  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);
  
  return c.json(data || []);
});

projectsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const { error } = await supabase.from('projects').insert({
    tenant_id: user.tenantId,
    client_id: data.clientId,
    title: data.title,
    description: data.description,
    budget: data.budget,
    deadline: data.deadline,
    created_by: parseInt(user.sub as string),
    status: 'active',
    priority: 'medium',
  });

  if (error) return c.json({ error: error.message }, 500);

  await supabase.from('activity_logs').insert({
    tenant_id: user.tenantId,
    user_id: parseInt(user.sub as string),
    action: `Project '${data.title}' created.`,
  });

  return c.json({ success: true });
});

projectsRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('id');
  const data = await c.req.json();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const { error } = await supabase.from('projects')
    .update({
      title: data.title,
      description: data.description,
      budget: data.budget,
      deadline: data.deadline,
      status: data.status,
      priority: data.priority,
    })
    .eq('id', projectId)
    .eq('tenant_id', user.tenantId);

  if (error) return c.json({ error: error.message }, 500);

  await supabase.from('activity_logs').insert({
    tenant_id: user.tenantId,
    user_id: parseInt(user.sub as string),
    action: `Project '${data.title}' details updated.`,
  });

  return c.json({ success: true });
});

projectsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('id');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { error } = await supabase.from('projects')
    .delete()
    .eq('id', projectId)
    .eq('tenant_id', user.tenantId);
    
  if (error) return c.json({ error: error.message }, 500);
  
  await supabase.from('activity_logs').insert({
    tenant_id: user.tenantId,
    user_id: parseInt(user.sub as string),
    action: `Project ID ${projectId} deleted.`,
  });

  return c.json({ success: true });
});

export default projectsRoutes;
