import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import * as schema from '../db/schema';
import { eq, inArray, desc, ne, and, isNull, sql } from 'drizzle-orm';
import { fromCents, toCents } from '../lib/calculations';

const portalRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any } }>();

portalRoutes.use('*', requireAuth);

portalRoutes.get('/stats', async (c) => {
  const user = c.get('user');
  if (user.role !== 'administrator') return c.json({ error: 'Unauthorized' }, 403);
  
  const db = c.get('db');
  
  try {
    const clients = await db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.tenantId, user.tenantId));
    const activeProjects = await db.select({ id: schema.projects.id }).from(schema.projects).where(and(eq(schema.projects.tenantId, user.tenantId), eq(schema.projects.status, 'active')));
    const allProjects = await db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.tenantId, user.tenantId));
    const invoices = await db.select({ amount: schema.invoices.total }).from(schema.invoices).where(and(eq(schema.invoices.tenantId, user.tenantId), eq(schema.invoices.status, 'paid'), isNull(schema.invoices.deletedAt)));
    
    const revenueCents = invoices.reduce((acc: number, inv: any) => acc + toCents(inv.amount || '0.00'), 0);
    const revenue = fromCents(revenueCents);

    return c.json({
      totalClients: clients.length,
      activeProjects: activeProjects.length,
      allProjects: allProjects.length,
      revenue: revenue,
    });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

portalRoutes.get('/client/dashboard', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  
  const db = c.get('db');
  
  try {
    const [clientRecord] = await db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.userId, parseInt(user.sub as string))).limit(1);
    if (!clientRecord) return c.json({ activeProjects: [], recentFiles: [] });
    const clientId = clientRecord.id;

    const activeProjects = await db.select({
      id: schema.projects.id,
      title: schema.projects.title,
      status: schema.projects.status,
      createdAt: schema.projects.createdAt,
      dueDate: schema.projects.deadline
    }).from(schema.projects).where(and(eq(schema.projects.clientId, clientId), ne(schema.projects.status, 'completed')));
      
    let projectsWithProgress: any[] = [];
    if (activeProjects.length > 0) {
      const projectIds = activeProjects.map(p => p.id);
      
      const tasks = await db.select({ projectId: schema.tasks.projectId, status: schema.tasks.status })
        .from(schema.tasks)
        .where(and(
          inArray(schema.tasks.projectId, projectIds),
          eq(schema.tasks.tenantId, user.tenantId),
          isNull(schema.tasks.deletedAt)
        ));
      
      projectsWithProgress = activeProjects.map(project => {
        const projectTasks = tasks.filter((t: any) => t.projectId === project.id);
        const totalTasks = projectTasks.length;
        const completedTasks = projectTasks.filter((t: any) => t.status === 'completed').length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        let dueInDays = null;
        if (project.dueDate) {
          const dueDate = new Date(project.dueDate);
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

    const allProjects = await db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.clientId, clientId));
    let recentFiles: any[] = [];
    
    if (allProjects.length > 0) {
      const allProjectIds = allProjects.map(p => p.id);
      recentFiles = await db.select().from(schema.files)
        .where(and(inArray(schema.files.projectId, allProjectIds), inArray(schema.files.status, ['client_review', 'approved'])))
        .orderBy(desc(schema.files.uploadedAt))
        .limit(5);
    }

    return c.json({
      activeProjects: projectsWithProgress,
      recentFiles
    });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

portalRoutes.get('/client/projects', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  
  const db = c.get('db');
  
  try {
    const [clientRecord] = await db.select().from(schema.clients).where(eq(schema.clients.userId, parseInt(user.sub as string))).limit(1);
    if (!clientRecord) return c.json([]);

    const data = await db.select().from(schema.projects).where(eq(schema.projects.clientId, clientRecord.id)).orderBy(desc(schema.projects.createdAt));
    return c.json(data);
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

portalRoutes.get('/client/projects/:id', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  const projectId = parseInt(c.req.param('id'));
  const db = c.get('db');
  
  try {
    const [clientRecord] = await db.select().from(schema.clients).where(eq(schema.clients.userId, parseInt(user.sub as string))).limit(1);
    if (!clientRecord) return c.json({ error: 'Unauthorized' }, 403);

    const [projectList] = await db.select().from(schema.projects).where(and(eq(schema.projects.id, projectId), eq(schema.projects.clientId, clientRecord.id))).limit(1);
    if (!projectList) return c.json({ error: 'Unauthorized' }, 403);
    
    return c.json(projectList);
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

portalRoutes.get('/client/projects/:id/files', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  const projectId = parseInt(c.req.param('id'));
  const db = c.get('db');
  
  try {
    const [clientRecord] = await db.select().from(schema.clients).where(eq(schema.clients.userId, parseInt(user.sub as string))).limit(1);
    if (!clientRecord) return c.json({ error: 'Unauthorized' }, 403);

    const [projectList] = await db.select().from(schema.projects).where(and(eq(schema.projects.id, projectId), eq(schema.projects.clientId, clientRecord.id))).limit(1);
    if (!projectList) return c.json({ error: 'Unauthorized' }, 403);

    const data = await db.select().from(schema.files).where(and(eq(schema.files.projectId, projectId), inArray(schema.files.status, ['client_review', 'approved']))).orderBy(desc(schema.files.uploadedAt));
    return c.json(data);
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

portalRoutes.get('/client/invoices', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  
  const status = c.req.query('status');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const db = c.get('db');
  
  try {
    const [clientRecord] = await db.select().from(schema.clients).where(eq(schema.clients.userId, parseInt(user.sub as string))).limit(1);
    if (!clientRecord) return c.json({ data: [], total: 0, page, limit });

    let conditions = [
      eq(schema.invoices.clientId, clientRecord.id),
      inArray(schema.invoices.status, ['sent', 'paid', 'overdue']),
      isNull(schema.invoices.deletedAt)
    ];
    if (status) conditions.push(eq(schema.invoices.status, status as any));

    const offset = (page - 1) * limit;
    
    const [countRes] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(schema.invoices)
      .where(and(...conditions));
    const total = countRes.count;

    const invoicesData = await db.select().from(schema.invoices)
      .where(and(...conditions))
      .orderBy(desc(schema.invoices.createdAt))
      .limit(limit)
      .offset(offset);

    const projectIds = [...new Set(invoicesData.map(i => i.projectId).filter(Boolean))] as number[];
    const projects = projectIds.length > 0 ? await db.select().from(schema.projects).where(inArray(schema.projects.id, projectIds)) : [];

    const formatted = invoicesData.map((invoice: any) => ({
      invoice,
      project: projects.find(p => p.id === invoice.projectId) || null
    }));

    return c.json({ data: formatted, total, page, limit });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

portalRoutes.get('/client/invoices/:id', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  const invoiceId = parseInt(c.req.param('id'));
  const db = c.get('db');
  
  try {
    const [clientRecord] = await db.select().from(schema.clients).where(eq(schema.clients.userId, parseInt(user.sub as string))).limit(1);
    if (!clientRecord) return c.json({ error: 'Unauthorized' }, 403);

    const [invoiceData] = await db.select().from(schema.invoices).where(
      and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.clientId, clientRecord.id), inArray(schema.invoices.status, ['sent', 'paid', 'overdue']), isNull(schema.invoices.deletedAt))
    ).limit(1);
    if (!invoiceData) return c.json({ error: 'Not found' }, 404);

    const items = await db.select().from(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, invoiceId));
    
    const logs = await db.select().from(schema.activityLogs)
      .where(and(eq(schema.activityLogs.entityType, 'invoice'), eq(schema.activityLogs.entityId, invoiceId)))
      .orderBy(desc(schema.activityLogs.createdAt));

    const proofs = await db.select().from(schema.paymentProofs)
      .where(eq(schema.paymentProofs.invoiceId, invoiceId))
      .orderBy(desc(schema.paymentProofs.uploadedAt));
      
    let project = null;
    if (invoiceData.projectId) {
      [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, invoiceData.projectId)).limit(1);
    }
    
    return c.json({
      invoice: invoiceData,
      client: clientRecord,
      project,
      items: items || [],
      logs,
      proofs
    });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

portalRoutes.get('/client/quotes', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  
  const status = c.req.query('status');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const db = c.get('db');
  
  try {
    const [clientRecord] = await db.select().from(schema.clients).where(eq(schema.clients.userId, parseInt(user.sub as string))).limit(1);
    if (!clientRecord) return c.json({ data: [], total: 0, page, limit });

    let conditions = [
      eq(schema.quotations.clientId, clientRecord.id),
      inArray(schema.quotations.status, ['sent', 'accepted', 'rejected', 'expired']),
      isNull(schema.quotations.deletedAt)
    ];
    if (status) conditions.push(eq(schema.quotations.status, status as any));

    const offset = (page - 1) * limit;
    
    const [countRes] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(schema.quotations)
      .where(and(...conditions));
    const total = countRes.count;

    const quotesData = await db.select().from(schema.quotations)
      .where(and(...conditions))
      .orderBy(desc(schema.quotations.createdAt))
      .limit(limit)
      .offset(offset);

    const projectIds = [...new Set(quotesData.map(i => i.projectId).filter(Boolean))] as number[];
    const projects = projectIds.length > 0 ? await db.select().from(schema.projects).where(inArray(schema.projects.id, projectIds)) : [];

    const formatted = quotesData.map((quote: any) => ({
      quote,
      project: projects.find(p => p.id === quote.projectId) || null
    }));

    return c.json({ data: formatted, total, page, limit });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

portalRoutes.get('/team/projects', async (c) => {
  const user = c.get('user');
  if (!['employee', 'freelancer'].includes(user.role)) return c.json({ error: 'Unauthorized' }, 403);
  const db = c.get('db');
  
  try {
    const assigned = await db.select({ projectId: schema.projectTeam.projectId }).from(schema.projectTeam).where(eq(schema.projectTeam.userId, parseInt(user.sub as string)));
    if (assigned.length === 0) return c.json([]);

    const projectIds = assigned.map(a => a.projectId);
    const data = await db.select().from(schema.projects).where(inArray(schema.projects.id, projectIds)).orderBy(desc(schema.projects.createdAt));
    
    const clientIds = [...new Set(data.map(i => i.clientId).filter(Boolean))] as number[];
    const clients = clientIds.length > 0 ? await db.select().from(schema.clients).where(inArray(schema.clients.id, clientIds)) : [];

    const formatted = data.map((project: any) => {
      const client = clients.find(c => c.id === project.clientId) || null;
      return { project, client };
    });
    return c.json(formatted);
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default portalRoutes;
