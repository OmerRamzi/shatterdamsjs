import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import { createClient } from '@supabase/supabase-js';

const portalRoutes = new Hono<{ Bindings: { SUPABASE_URL: string, SUPABASE_ANON_KEY: string }, Variables: { user: any } }>();

portalRoutes.use('*', requireAuth);

portalRoutes.get('/client/projects', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { data: clientRecord } = await supabase.from('clients').select('*').eq('userId', user.sub).limit(1);
  if (!clientRecord || clientRecord.length === 0) return c.json([]);

  const { data } = await supabase.from('projects').select('*').eq('clientId', clientRecord[0].id).order('createdAt', { ascending: false });
  return c.json(data || []);
});

portalRoutes.get('/client/projects/:id', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  const projectId = c.req.param('id');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { data: clientRecord } = await supabase.from('clients').select('*').eq('userId', user.sub).limit(1);
  if (!clientRecord || clientRecord.length === 0) return c.json({ error: 'Unauthorized' }, 403);

  const { data: projectList } = await supabase.from('projects').select('*').eq('id', projectId).eq('clientId', clientRecord[0].id).limit(1);
  if (!projectList || projectList.length === 0) return c.json({ error: 'Unauthorized' }, 403);
  
  return c.json(projectList[0]);
});

portalRoutes.get('/client/projects/:id/files', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  const projectId = c.req.param('id');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { data: clientRecord } = await supabase.from('clients').select('*').eq('userId', user.sub).limit(1);
  if (!clientRecord || clientRecord.length === 0) return c.json({ error: 'Unauthorized' }, 403);

  const { data: projectList } = await supabase.from('projects').select('*').eq('id', projectId).eq('clientId', clientRecord[0].id).limit(1);
  if (!projectList || projectList.length === 0) return c.json({ error: 'Unauthorized' }, 403);

  const { data } = await supabase.from('files').select('*').eq('projectId', projectId).in('status', ['client_review', 'approved']).order('uploadedAt', { ascending: false });
  return c.json(data || []);
});

portalRoutes.get('/team/projects', async (c) => {
  const user = c.get('user');
  if (!['employee', 'freelancer'].includes(user.role)) return c.json({ error: 'Unauthorized' }, 403);
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { data: assigned } = await supabase.from('project_team').select('projectId').eq('userId', user.sub);
  if (!assigned || assigned.length === 0) return c.json([]);

  const projectIds = assigned.map(a => a.projectId);
  const { data } = await supabase.from('projects').select('*, client:clients(*)').in('id', projectIds).order('createdAt', { ascending: false });

  const formatted = (data || []).map((row: any) => {
    const { client, ...project } = row;
    return { project, client };
  });
  return c.json(formatted);
});

export default portalRoutes;
