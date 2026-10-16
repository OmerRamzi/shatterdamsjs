import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import * as schema from '../db/schema';
import { eq, and, isNull, desc, inArray } from 'drizzle-orm';

const tasksRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any } }>();

tasksRoutes.use('*', requireAuth);

/**
 * GET /api/tasks
 * Supports filtering by projectId, status, assignedTo, milestoneId
 */
tasksRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const projectIdParam = c.req.query('projectId');
  const statusParam = c.req.query('status');
  const assignedToParam = c.req.query('assignedTo');
  const milestoneIdParam = c.req.query('milestoneId');

  try {
    const conditions = [
      eq(schema.tasks.tenantId, user.tenantId),
      isNull(schema.tasks.deletedAt)
    ];

    if (projectIdParam) {
      conditions.push(eq(schema.tasks.projectId, parseInt(projectIdParam)));
    }
    if (statusParam) {
      conditions.push(eq(schema.tasks.status, statusParam as any));
    }
    if (assignedToParam) {
      conditions.push(eq(schema.tasks.assignedTo, parseInt(assignedToParam)));
    }
    if (milestoneIdParam) {
      conditions.push(eq(schema.tasks.milestoneId, parseInt(milestoneIdParam)));
    }

    const tasksList = await db.select().from(schema.tasks)
      .where(and(...conditions))
      .orderBy(schema.tasks.orderIndex, desc(schema.tasks.createdAt));

    // Enrich with assignees and milestones
    const userIds = [...new Set(tasksList.map(t => t.assignedTo).filter(Boolean))] as number[];
    const milestoneIds = [...new Set(tasksList.map(t => t.milestoneId).filter(Boolean))] as number[];

    const usersMap = new Map<number, { id: number; name: string; email: string; profileImage: string | null }>();
    if (userIds.length > 0) {
      const usersRows = await db.select({
        id: schema.users.id,
        name: schema.users.displayName,
        email: schema.users.email,
        profileImage: schema.users.profileImage
      })
      .from(schema.users)
      .where(and(inArray(schema.users.id, userIds), eq(schema.users.tenantId, user.tenantId)));
      
      for (const u of usersRows) {
        usersMap.set(u.id, u);
      }
    }

    const milestonesMap = new Map<number, { id: number; title: string }>();
    if (milestoneIds.length > 0) {
      const milestoneRows = await db.select({
        id: schema.milestones.id,
        title: schema.milestones.title
      })
      .from(schema.milestones)
      .where(and(inArray(schema.milestones.id, milestoneIds), eq(schema.milestones.tenantId, user.tenantId)));
      
      for (const m of milestoneRows) {
        milestonesMap.set(m.id, m);
      }
    }

    const enriched = tasksList.map(t => ({
      ...t,
      assignee: t.assignedTo ? usersMap.get(t.assignedTo) || null : null,
      milestone: t.milestoneId ? milestonesMap.get(t.milestoneId) || null : null,
      subtasksCount: Array.isArray(t.subtasks) ? (t.subtasks as any[]).length : 0,
      completedSubtasksCount: Array.isArray(t.subtasks) ? (t.subtasks as any[]).filter(st => st.completed).length : 0
    }));

    return c.json(enriched);
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/tasks/project/:projectId
 * Backwards-compatible route for fetching tasks for a project
 */
tasksRoutes.get('/project/:projectId', async (c) => {
  const user = c.get('user');
  const projectId = parseInt(c.req.param('projectId'));
  const db = c.get('db');

  if (isNaN(projectId)) {
    return c.json({ error: 'Invalid project ID' }, 400);
  }

  try {
    const tasksList = await db.select().from(schema.tasks)
      .where(and(
        eq(schema.tasks.tenantId, user.tenantId),
        eq(schema.tasks.projectId, projectId),
        isNull(schema.tasks.deletedAt)
      ))
      .orderBy(schema.tasks.orderIndex, desc(schema.tasks.createdAt));

    // Enrich with assignees and milestones
    const userIds = [...new Set(tasksList.map(t => t.assignedTo).filter(Boolean))] as number[];
    const milestoneIds = [...new Set(tasksList.map(t => t.milestoneId).filter(Boolean))] as number[];

    const usersMap = new Map<number, { id: number; name: string; email: string; profileImage: string | null }>();
    if (userIds.length > 0) {
      const usersRows = await db.select({
        id: schema.users.id,
        name: schema.users.displayName,
        email: schema.users.email,
        profileImage: schema.users.profileImage
      })
      .from(schema.users)
      .where(and(inArray(schema.users.id, userIds), eq(schema.users.tenantId, user.tenantId)));
      
      for (const u of usersRows) {
        usersMap.set(u.id, u);
      }
    }

    const milestonesMap = new Map<number, { id: number; title: string }>();
    if (milestoneIds.length > 0) {
      const milestoneRows = await db.select({
        id: schema.milestones.id,
        title: schema.milestones.title
      })
      .from(schema.milestones)
      .where(and(inArray(schema.milestones.id, milestoneIds), eq(schema.milestones.tenantId, user.tenantId)));
      
      for (const m of milestoneRows) {
        milestonesMap.set(m.id, m);
      }
    }

    const enriched = tasksList.map(t => ({
      ...t,
      assignee: t.assignedTo ? usersMap.get(t.assignedTo) || null : null,
      milestone: t.milestoneId ? milestonesMap.get(t.milestoneId) || null : null,
      subtasksCount: Array.isArray(t.subtasks) ? (t.subtasks as any[]).length : 0,
      completedSubtasksCount: Array.isArray(t.subtasks) ? (t.subtasks as any[]).filter(st => st.completed).length : 0
    }));

    return c.json(enriched);
  } catch (error: any) {
    console.error('Error fetching project tasks:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/tasks
 * Create a new task
 */
tasksRoutes.post('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();
  const db = c.get('db');

  if (!data.title?.trim() || !data.projectId) {
    return c.json({ error: 'Title and projectId are required' }, 400);
  }

  try {
    // Format subtasks if provided
    let formattedSubtasks: any[] = [];
    if (Array.isArray(data.subtasks)) {
      formattedSubtasks = data.subtasks.map((st: any, idx: number) => {
        if (typeof st === 'string') {
          return { id: `sub_${Date.now()}_${idx}`, title: st, completed: false };
        }
        return {
          id: st.id || `sub_${Date.now()}_${idx}`,
          title: st.title || '',
          completed: !!st.completed
        };
      });
    }

    const [newTask] = await db.insert(schema.tasks).values({
      tenantId: user.tenantId,
      projectId: parseInt(data.projectId),
      milestoneId: data.milestoneId ? parseInt(data.milestoneId) : null,
      assignedTo: data.assignedTo || data.assigneeId ? parseInt(data.assignedTo || data.assigneeId) : null,
      title: data.title.trim(),
      description: data.description || null,
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      dueDate: data.dueDate ? data.dueDate.split('T')[0] : null,
      estimatedHours: data.estimatedHours ? Number(data.estimatedHours).toFixed(2) : '0.00',
      subtasks: formattedSubtasks,
      orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : 0,
    }).returning();

    return c.json({ success: true, task: newTask });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /api/tasks/:id
 * Full edit of a task
 */
tasksRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const taskId = parseInt(c.req.param('id'));
  const data = await c.req.json();
  const db = c.get('db');

  if (isNaN(taskId)) {
    return c.json({ error: 'Invalid task ID' }, 400);
  }

  try {
    const updatePayload: any = {
      updatedAt: new Date().toISOString()
    };

    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.status !== undefined) {
      updatePayload.status = data.status;
      if (data.status === 'completed') {
        updatePayload.completedAt = new Date().toISOString();
      } else {
        updatePayload.completedAt = null;
      }
    }
    if (data.priority !== undefined) updatePayload.priority = data.priority;
    if (data.dueDate !== undefined) updatePayload.dueDate = data.dueDate ? data.dueDate.split('T')[0] : null;
    if (data.assignedTo !== undefined || data.assigneeId !== undefined) {
      const assignedVal = data.assignedTo !== undefined ? data.assignedTo : data.assigneeId;
      updatePayload.assignedTo = assignedVal ? parseInt(assignedVal) : null;
    }
    if (data.milestoneId !== undefined) {
      updatePayload.milestoneId = data.milestoneId ? parseInt(data.milestoneId) : null;
    }
    if (data.estimatedHours !== undefined) {
      updatePayload.estimatedHours = Number(data.estimatedHours).toFixed(2);
    }
    if (data.subtasks !== undefined && Array.isArray(data.subtasks)) {
      updatePayload.subtasks = data.subtasks;
    }
    if (data.orderIndex !== undefined) {
      updatePayload.orderIndex = parseInt(data.orderIndex);
    }

    await db.update(schema.tasks)
      .set(updatePayload)
      .where(and(eq(schema.tasks.id, taskId), eq(schema.tasks.tenantId, user.tenantId)));

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PATCH /api/tasks/:id/status
 * Lightweight status transition (used during Kanban drag & drop)
 */
tasksRoutes.patch('/:id/status', async (c) => {
  const user = c.get('user');
  const taskId = parseInt(c.req.param('id'));
  const { status, orderIndex } = await c.req.json();
  const db = c.get('db');

  if (isNaN(taskId) || !status) {
    return c.json({ error: 'Valid taskId and status are required' }, 400);
  }

  try {
    const updatePayload: any = {
      status,
      updatedAt: new Date().toISOString()
    };

    if (status === 'completed') {
      updatePayload.completedAt = new Date().toISOString();
    } else {
      updatePayload.completedAt = null;
    }

    if (typeof orderIndex === 'number') {
      updatePayload.orderIndex = orderIndex;
    }

    await db.update(schema.tasks)
      .set(updatePayload)
      .where(and(eq(schema.tasks.id, taskId), eq(schema.tasks.tenantId, user.tenantId)));

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error updating task status:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PATCH /api/tasks/:id/subtasks
 * Toggle or update checklist subtasks
 */
tasksRoutes.patch('/:id/subtasks', async (c) => {
  const user = c.get('user');
  const taskId = parseInt(c.req.param('id'));
  const { subtasks } = await c.req.json();
  const db = c.get('db');

  if (isNaN(taskId) || !Array.isArray(subtasks)) {
    return c.json({ error: 'Valid taskId and subtasks array are required' }, 400);
  }

  try {
    await db.update(schema.tasks)
      .set({
        subtasks,
        updatedAt: new Date().toISOString()
      })
      .where(and(eq(schema.tasks.id, taskId), eq(schema.tasks.tenantId, user.tenantId)));

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error updating task subtasks:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /api/tasks/:id
 * Soft deletes task
 */
tasksRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const taskId = parseInt(c.req.param('id'));
  const db = c.get('db');

  if (isNaN(taskId)) {
    return c.json({ error: 'Invalid task ID' }, 400);
  }

  try {
    await db.update(schema.tasks)
      .set({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .where(and(eq(schema.tasks.id, taskId), eq(schema.tasks.tenantId, user.tenantId)));

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/tasks/:id/comments
 * Fetch discussion comments for a task
 */
tasksRoutes.get('/:id/comments', async (c) => {
  const user = c.get('user');
  const taskId = parseInt(c.req.param('id'));
  const db = c.get('db');

  if (isNaN(taskId)) {
    return c.json({ error: 'Invalid task ID' }, 400);
  }

  try {
    const comments = await db.select({
      id: schema.taskComments.id,
      comment: schema.taskComments.comment,
      createdAt: schema.taskComments.createdAt,
      userId: schema.taskComments.userId,
      userName: schema.users.displayName,
      userEmail: schema.users.email,
      userAvatar: schema.users.profileImage
    })
    .from(schema.taskComments)
    .leftJoin(schema.users, eq(schema.taskComments.userId, schema.users.id))
    .where(and(
      eq(schema.taskComments.taskId, taskId),
      eq(schema.taskComments.tenantId, user.tenantId)
    ))
    .orderBy(schema.taskComments.createdAt);

    return c.json(comments);
  } catch (error: any) {
    console.error('Error fetching task comments:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/tasks/:id/comments
 * Add a comment to a task
 */
tasksRoutes.post('/:id/comments', async (c) => {
  const user = c.get('user');
  const taskId = parseInt(c.req.param('id'));
  const { comment } = await c.req.json();
  const db = c.get('db');

  if (isNaN(taskId) || !comment?.trim()) {
    return c.json({ error: 'Task ID and comment content are required' }, 400);
  }

  try {
    const [newComment] = await db.insert(schema.taskComments).values({
      tenantId: user.tenantId,
      taskId,
      userId: parseInt(user.sub as string),
      comment: comment.trim(),
    }).returning();

    return c.json({
      success: true,
      comment: {
        ...newComment,
        userName: user.name || 'User',
        userEmail: user.email
      }
    });
  } catch (error: any) {
    console.error('Error posting task comment:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default tasksRoutes;
