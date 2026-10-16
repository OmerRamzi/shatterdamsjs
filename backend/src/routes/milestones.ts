import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import * as schema from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

const milestonesRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any } }>();

milestonesRoutes.use('*', requireAuth);

/**
 * GET /api/milestones?projectId=X
 * List milestones for a project with task counts and progress
 */
milestonesRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const projectIdParam = c.req.query('projectId');

  if (!projectIdParam) {
    return c.json({ error: 'projectId query parameter is required' }, 400);
  }

  const projectId = parseInt(projectIdParam);
  if (isNaN(projectId)) {
    return c.json({ error: 'Invalid project ID' }, 400);
  }

  try {
    const milestonesList = await db.select().from(schema.milestones)
      .where(and(
        eq(schema.milestones.tenantId, user.tenantId),
        eq(schema.milestones.projectId, projectId)
      ))
      .orderBy(schema.milestones.orderIndex, schema.milestones.id);

    // Fetch tasks for these milestones to compute progress
    const projectTasks = await db.select({
      id: schema.tasks.id,
      milestoneId: schema.tasks.milestoneId,
      status: schema.tasks.status
    })
    .from(schema.tasks)
    .where(and(
      eq(schema.tasks.tenantId, user.tenantId),
      eq(schema.tasks.projectId, projectId),
      isNull(schema.tasks.deletedAt)
    ));

    const enriched = milestonesList.map(m => {
      const mTasks = projectTasks.filter(t => t.milestoneId === m.id);
      const totalTasks = mTasks.length;
      const completedTasks = mTasks.filter(t => t.status === 'completed').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...m,
        totalTasks,
        completedTasks,
        progress
      };
    });

    return c.json(enriched);
  } catch (error: any) {
    console.error('Error fetching milestones:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/milestones
 * Create a milestone
 */
milestonesRoutes.post('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();
  const db = c.get('db');

  if (!data.title?.trim() || !data.projectId) {
    return c.json({ error: 'Title and projectId are required' }, 400);
  }

  try {
    const [newMilestone] = await db.insert(schema.milestones).values({
      tenantId: user.tenantId,
      projectId: parseInt(data.projectId),
      title: data.title.trim(),
      description: data.description || null,
      dueDate: data.dueDate ? data.dueDate.split('T')[0] : null,
      status: data.status || 'pending',
      amount: data.amount ? String(data.amount) : null,
      orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : 0,
    }).returning();

    return c.json({ success: true, milestone: newMilestone });
  } catch (error: any) {
    console.error('Error creating milestone:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /api/milestones/:id
 * Update a milestone
 */
milestonesRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const milestoneId = parseInt(c.req.param('id'));
  const data = await c.req.json();
  const db = c.get('db');

  if (isNaN(milestoneId)) {
    return c.json({ error: 'Invalid milestone ID' }, 400);
  }

  try {
    const updatePayload: any = {
      updatedAt: new Date().toISOString()
    };

    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.dueDate !== undefined) updatePayload.dueDate = data.dueDate ? data.dueDate.split('T')[0] : null;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.amount !== undefined) updatePayload.amount = data.amount ? String(data.amount) : null;
    if (data.orderIndex !== undefined) updatePayload.orderIndex = parseInt(data.orderIndex);

    await db.update(schema.milestones)
      .set(updatePayload)
      .where(and(
        eq(schema.milestones.id, milestoneId),
        eq(schema.milestones.tenantId, user.tenantId)
      ));

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error updating milestone:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /api/milestones/:id
 * Delete a milestone
 */
milestonesRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const milestoneId = parseInt(c.req.param('id'));
  const db = c.get('db');

  if (isNaN(milestoneId)) {
    return c.json({ error: 'Invalid milestone ID' }, 400);
  }

  try {
    await db.delete(schema.milestones)
      .where(and(
        eq(schema.milestones.id, milestoneId),
        eq(schema.milestones.tenantId, user.tenantId)
      ));

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting milestone:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default milestonesRoutes;
