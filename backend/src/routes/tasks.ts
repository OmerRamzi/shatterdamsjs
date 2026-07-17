import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import { getDb } from '../db/client';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

const tasksRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any } }>();

tasksRoutes.use('*', requireAuth);

tasksRoutes.get('/project/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'));
  const db = getDb(c.env.DATABASE_URL);
  
  try {
    const data = await db.select().from(schema.tasks)
      .where(eq(schema.tasks.projectId, projectId))
      .orderBy(schema.tasks.id);
      
    return c.json(data);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

tasksRoutes.post('/', requireAdmin, async (c) => {
  const data = await c.req.json();
  const db = getDb(c.env.DATABASE_URL);

  try {
    await db.insert(schema.tasks).values({
      projectId: data.projectId,
      title: data.title,
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      assignedTo: data.assigneeId
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

tasksRoutes.put('/:id', requireAdmin, async (c) => {
  const taskId = parseInt(c.req.param('id'));
  const data = await c.req.json();
  const db = getDb(c.env.DATABASE_URL);

  try {
    await db.update(schema.tasks).set({
      assignedTo: data.assigneeId,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
    }).where(eq(schema.tasks.id, taskId));
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

tasksRoutes.delete('/:id', requireAdmin, async (c) => {
  const taskId = parseInt(c.req.param('id'));
  const db = getDb(c.env.DATABASE_URL);
  
  try {
    await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default tasksRoutes;
