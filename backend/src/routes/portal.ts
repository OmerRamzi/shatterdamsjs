import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import { createClient } from '@supabase/supabase-js';

const portalRoutes = new Hono<{ Bindings: { SUPABASE_URL: string, SUPABASE_ANON_KEY: string }, Variables: { user: any } }>();

portalRoutes.use('*', requireAuth);

portalRoutes.get('/stats', async (c) => {
  const user = c.get('user');
  if (user.role !== 'administrator') return c.json({ error: 'Unauthorized' }, 403);
  
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const [clientsRes, activeProjectsRes, allProjectsRes, invoicesRes] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact' }).eq('tenant_id', user.tenantId),
    supabase.from('projects').select('id', { count: 'exact' }).eq('tenant_id', user.tenantId).eq('status', 'active'),
    supabase.from('projects').select('id', { count: 'exact' }).eq('tenant_id', user.tenantId),
    supabase.from('invoices').select('amount').eq('tenant_id', user.tenantId).eq('status', 'paid')
  ]);
  
  const revenue = (invoicesRes.data || []).reduce((acc: number, inv: any) => acc + (Number(inv.amount) || 0), 0);

  return c.json({
    totalClients: clientsRes.count || 0,
    activeProjects: activeProjectsRes.count || 0,
    allProjects: allProjectsRes.count || 0,
    revenue: revenue,
  });
});

portalRoutes.get('/client/dashboard', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  // Get client record
  const { data: clientRecord } = await supabase.from('clients').select('id').eq('user_id', user.sub).limit(1);
  if (!clientRecord || clientRecord.length === 0) return c.json({ activeProjects: [], recentFiles: [] });
  const clientId = clientRecord[0].id;

  // Get active projects
  const { data: activeProjects } = await supabase.from('projects')
    .select('id, title, status, created_at, due_date')
    .eq('client_id', clientId)
    .neq('status', 'completed');
    
  let projectsWithProgress: any[] = [];
  if (activeProjects && activeProjects.length > 0) {
    const projectIds = activeProjects.map(p => p.id);
    
    // Fetch tasks for these projects to calculate progress
    const { data: tasks } = await supabase.from('tasks').select('project_id, status').in('project_id', projectIds);
    
    projectsWithProgress = activeProjects.map(project => {
      const projectTasks = (tasks || []).filter((t: any) => t.project_id === project.id);
      const totalTasks = projectTasks.length;
      const completedTasks = projectTasks.filter((t: any) => t.status === 'completed').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // Calculate due in days
      let dueInDays = null;
      if (project.due_date) {
        const dueDate = new Date(project.due_date);
        const today = new Date();
        const diffTime = dueDate.getTime() - today.getTime();
        dueInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      }

      return {
        ...project,
        progress,
        dueInDays
      };
    });
  }

  // Get recent files across all client's projects
  const { data: allProjects } = await supabase.from('projects').select('id').eq('client_id', clientId);
  let recentFiles: any[] = [];
  
  if (allProjects && allProjects.length > 0) {
    const allProjectIds = allProjects.map(p => p.id);
    const { data: files } = await supabase.from('files')
      .select('*')
      .in('project_id', allProjectIds)
      .in('status', ['client_review', 'approved'])
      .order('uploaded_at', { ascending: false })
      .limit(5);
      
    recentFiles = files || [];
  }

  return c.json({
    activeProjects: projectsWithProgress,
    recentFiles
  });
});

portalRoutes.get('/client/projects', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { data: clientRecord } = await supabase.from('clients').select('*').eq('user_id', user.sub).limit(1);
  if (!clientRecord || clientRecord.length === 0) return c.json([]);

  const { data } = await supabase.from('projects').select('*').eq('client_id', clientRecord[0].id).order('created_at', { ascending: false });
  return c.json(data || []);
});

portalRoutes.get('/client/projects/:id', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  const projectId = c.req.param('id');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { data: clientRecord } = await supabase.from('clients').select('*').eq('user_id', user.sub).limit(1);
  if (!clientRecord || clientRecord.length === 0) return c.json({ error: 'Unauthorized' }, 403);

  const { data: projectList } = await supabase.from('projects').select('*').eq('id', projectId).eq('client_id', clientRecord[0].id).limit(1);
  if (!projectList || projectList.length === 0) return c.json({ error: 'Unauthorized' }, 403);
  
  return c.json(projectList[0]);
});

portalRoutes.get('/client/projects/:id/files', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  const projectId = c.req.param('id');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { data: clientRecord } = await supabase.from('clients').select('*').eq('user_id', user.sub).limit(1);
  if (!clientRecord || clientRecord.length === 0) return c.json({ error: 'Unauthorized' }, 403);

  const { data: projectList } = await supabase.from('projects').select('*').eq('id', projectId).eq('client_id', clientRecord[0].id).limit(1);
  if (!projectList || projectList.length === 0) return c.json({ error: 'Unauthorized' }, 403);

  const { data } = await supabase.from('files').select('*').eq('project_id', projectId).in('status', ['client_review', 'approved']).order('uploaded_at', { ascending: false });
  return c.json(data || []);
});

portalRoutes.get('/team/projects', async (c) => {
  const user = c.get('user');
  if (!['employee', 'freelancer'].includes(user.role)) return c.json({ error: 'Unauthorized' }, 403);
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  const { data: assigned } = await supabase.from('project_team').select('project_id').eq('user_id', user.sub);
  if (!assigned || assigned.length === 0) return c.json([]);

  const projectIds = assigned.map(a => (a as any).project_id);
  const { data } = await supabase.from('projects').select('*, client:clients(*)').in('id', projectIds).order('created_at', { ascending: false });

  const formatted = (data || []).map((row: any) => {
    const { client, ...project } = row;
    return { project, client };
  });
  return c.json(formatted);
});

export default portalRoutes;
