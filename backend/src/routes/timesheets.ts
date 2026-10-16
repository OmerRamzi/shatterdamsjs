import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import * as schema from '../db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';

const timesheetsRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any } }>();

timesheetsRoutes.use('*', requireAuth);

timesheetsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const projectId = c.req.query('project_id') || c.req.query('projectId');
  const taskId = c.req.query('task_id') || c.req.query('taskId');
  const status = c.req.query('status');
  
  try {
    const conditions = [eq(schema.timesheets.tenantId, user.tenantId)];
    
    // Team members can only see their own timesheets, admins can see all
    if (user.role === 'team' || user.role === 'freelancer' || user.role === 'employee') {
      conditions.push(eq(schema.timesheets.userId, parseInt(user.sub as string)));
    }
    
    if (projectId) conditions.push(eq(schema.timesheets.projectId, parseInt(projectId)));
    if (taskId) conditions.push(eq(schema.timesheets.taskId, parseInt(taskId)));
    if (status === 'approved') conditions.push(eq(schema.timesheets.approved, true));
    if (status === 'pending') conditions.push(eq(schema.timesheets.approved, false));

    const offset = (page - 1) * limit;
    
    const [countRes] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(schema.timesheets)
      .where(and(...conditions));
    const total = countRes.count;
    
    const data = await db.select().from(schema.timesheets)
      .where(and(...conditions))
      .orderBy(desc(schema.timesheets.date))
      .limit(limit)
      .offset(offset);
      
    const userIds = [...new Set(data.map(t => t.userId).filter(Boolean))] as number[];
    const projectIds = [...new Set(data.map(t => t.projectId).filter(Boolean))] as number[];
    
    const users = userIds.length > 0 
      ? await db.select({
          id: schema.users.id,
          name: schema.users.displayName,
          email: schema.users.email,
          profileImage: schema.users.profileImage
        })
        .from(schema.users)
        .where(and(inArray(schema.users.id, userIds), eq(schema.users.tenantId, user.tenantId))) 
      : [];

    const projects = projectIds.length > 0 
      ? await db.select({
          id: schema.projects.id,
          title: schema.projects.title
        })
        .from(schema.projects)
        .where(and(inArray(schema.projects.id, projectIds), eq(schema.projects.tenantId, user.tenantId))) 
      : [];
    
    const formatted = data.map(ts => {
      const u = users.find(u => u.id === ts.userId) || null;
      const p = projects.find(p => p.id === ts.projectId) || null;
      return { timesheet: ts, user: u, project: p };
    });

    return c.json({ data: formatted, total, page, limit });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

timesheetsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();
  const db = c.get('db');

  if (!data.projectId || !data.hours || !data.date) {
    return c.json({ error: 'Project, hours, and date are required' }, 400);
  }

  try {
    const [newTimesheet] = await db.insert(schema.timesheets).values({
      tenantId: user.tenantId,
      userId: parseInt(user.sub as string),
      projectId: parseInt(data.projectId),
      taskId: data.taskId ? parseInt(data.taskId) : null,
      date: data.date.split('T')[0],
      hours: Number(data.hours).toFixed(2),
      description: data.description || null,
      billable: data.billable !== undefined ? !!data.billable : true,
      approved: false
    }).returning();

    return c.json({ success: true, timesheet: newTimesheet });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

timesheetsRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const id = parseInt(c.req.param('id'));
  const data = await c.req.json();
  const db = c.get('db');

  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  try {
    const [existing] = await db.select().from(schema.timesheets)
      .where(and(eq(schema.timesheets.id, id), eq(schema.timesheets.tenantId, user.tenantId)))
      .limit(1);
    
    if (!existing) return c.json({ error: 'Not found' }, 404);
    if (existing.approved) return c.json({ error: 'Cannot edit approved timesheet' }, 400);
    
    // Check permission
    const isOwner = existing.userId === parseInt(user.sub as string);
    const isAdmin = user.role === 'administrator';
    if (!isOwner && !isAdmin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await db.update(schema.timesheets).set({
      projectId: data.projectId ? parseInt(data.projectId) : existing.projectId,
      taskId: data.taskId !== undefined ? (data.taskId ? parseInt(data.taskId) : null) : existing.taskId,
      date: data.date ? data.date.split('T')[0] : existing.date,
      hours: data.hours ? Number(data.hours).toFixed(2) : existing.hours,
      description: data.description !== undefined ? data.description : existing.description,
      billable: data.billable !== undefined ? !!data.billable : existing.billable,
      approved: false, // Reset to pending if edited
      updatedAt: new Date().toISOString()
    }).where(eq(schema.timesheets.id, id));

    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

timesheetsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = parseInt(c.req.param('id'));
  const db = c.get('db');

  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  try {
    const [existing] = await db.select().from(schema.timesheets)
      .where(and(eq(schema.timesheets.id, id), eq(schema.timesheets.tenantId, user.tenantId)))
      .limit(1);
    
    if (!existing) return c.json({ error: 'Not found' }, 404);
    if (existing.approved) return c.json({ error: 'Cannot delete approved timesheet' }, 400);
    
    // Check permission
    const isOwner = existing.userId === parseInt(user.sub as string);
    const isAdmin = user.role === 'administrator';
    if (!isOwner && !isAdmin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await db.delete(schema.timesheets).where(eq(schema.timesheets.id, id));

    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

timesheetsRoutes.patch('/:id/status', requireAdmin, async (c) => {
  const user = c.get('user');
  const id = parseInt(c.req.param('id'));
  const { approved } = await c.req.json();
  const db = c.get('db');

  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  try {
    await db.update(schema.timesheets).set({
      approved: !!approved,
      approvedBy: approved ? parseInt(user.sub as string) : null,
      approvedAt: approved ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString()
    }).where(and(eq(schema.timesheets.id, id), eq(schema.timesheets.tenantId, user.tenantId)));

    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default timesheetsRoutes;
