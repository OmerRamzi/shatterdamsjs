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
  const projectId = c.req.query('project_id');
  const status = c.req.query('status');
  
  try {
    let conditions = [eq(schema.timesheets.tenantId, user.tenantId)];
    
    // Team members can only see their own timesheets, admins can see all
    if (user.role === 'team') {
      conditions.push(eq(schema.timesheets.userId, parseInt(user.sub as string)));
    }
    
    if (projectId) conditions.push(eq(schema.timesheets.projectId, parseInt(projectId)));
    if (status) conditions.push(eq(schema.timesheets.status, status as any));

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
      
    const userIds = [...new Set(data.map(t => t.userId).filter(Boolean))];
    const projectIds = [...new Set(data.map(t => t.projectId).filter(Boolean))];
    
    const users = userIds.length > 0 ? await db.select().from(schema.users).where(inArray(schema.users.id, userIds)) : [];
    const projects = projectIds.length > 0 ? await db.select().from(schema.projects).where(inArray(schema.projects.id, projectIds as number[])) : [];
    
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

  try {
    await db.insert(schema.timesheets).values({
      tenantId: user.tenantId,
      userId: parseInt(user.sub as string),
      projectId: data.projectId,
      date: data.date,
      hours: data.hours?.toString(),
      description: data.description,
      status: 'pending'
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

timesheetsRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const id = parseInt(c.req.param('id'));
  const data = await c.req.json();
  const db = c.get('db');

  try {
    const [existing] = await db.select().from(schema.timesheets).where(and(eq(schema.timesheets.id, id), eq(schema.timesheets.tenantId, user.tenantId))).limit(1);
    
    if (!existing) return c.json({ error: 'Not found' }, 404);
    if (existing.status === 'approved') return c.json({ error: 'Cannot edit approved timesheet' }, 400);
    
    // Check permission
    if (user.role === 'team' && existing.userId !== parseInt(user.sub as string)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await db.update(schema.timesheets).set({
      projectId: data.projectId,
      date: data.date,
      hours: data.hours?.toString(),
      description: data.description,
      status: 'pending' // Reset to pending if edited
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

  try {
    const [existing] = await db.select().from(schema.timesheets).where(and(eq(schema.timesheets.id, id), eq(schema.timesheets.tenantId, user.tenantId))).limit(1);
    
    if (!existing) return c.json({ error: 'Not found' }, 404);
    if (existing.status === 'approved') return c.json({ error: 'Cannot delete approved timesheet' }, 400);
    
    // Check permission
    if (user.role === 'team' && existing.userId !== parseInt(user.sub as string)) {
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
  const { status } = await c.req.json();
  const db = c.get('db');

  try {
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    await db.update(schema.timesheets).set({
      status,
      approvedBy: status === 'approved' ? parseInt(user.sub as string) : null
    }).where(and(eq(schema.timesheets.id, id), eq(schema.timesheets.tenantId, user.tenantId)));

    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default timesheetsRoutes;
