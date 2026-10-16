import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import * as schema from '../db/schema';
import { eq, and, desc, inArray, isNull } from 'drizzle-orm';
import { config } from '../config';
import { generateProjectBreakdown, chatWithProjectAssistant } from '../lib/gemini';

const projectsRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any } }>();

projectsRoutes.use('*', requireAuth);

async function getGeminiApiKey(c: any, db: any, tenantId: number): Promise<string> {
  let apiKey = (c.env as any)?.GEMINI_API_KEY || config.GEMINI_API_KEY;
  try {
    const [settingRow] = await db.select().from(schema.settings)
      .where(and(eq(schema.settings.tenantId, tenantId), eq(schema.settings.settingKey, 'gemini_api_key')))
      .limit(1);
    if (settingRow?.settingValue?.trim()) {
      apiKey = settingRow.settingValue.trim();
    }
  } catch {
    // Ignore setting query failures
  }
  return apiKey;
}

projectsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const clientId = c.req.query('clientId');
  const status = c.req.query('status');
  
  try {
    const conditions = [eq(schema.projects.tenantId, user.tenantId)];
    if (clientId) conditions.push(eq(schema.projects.clientId, parseInt(clientId)));
    if (status) conditions.push(eq(schema.projects.status, status as any));

    const data = await db.select().from(schema.projects)
      .where(and(...conditions))
      .orderBy(desc(schema.projects.createdAt));
      
    const clientIds = [...new Set(data.map(i => i.clientId).filter(Boolean))] as number[];
    const clients = clientIds.length > 0 
      ? await db.select().from(schema.clients)
          .where(and(inArray(schema.clients.id, clientIds), eq(schema.clients.tenantId, user.tenantId))) 
      : [];

    const formatted = data.map((projectData) => {
      const client = clients.find(c => c.id === projectData.clientId) || null;
      return { ...projectData, client };
    });

    return c.json(formatted);
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

projectsRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const projectId = parseInt(c.req.param('id'));
  const db = c.get('db');

  if (isNaN(projectId)) {
    return c.json({ error: 'Invalid project ID' }, 400);
  }

  try {
    const [project] = await db.select().from(schema.projects)
      .where(and(eq(schema.projects.id, projectId), eq(schema.projects.tenantId, user.tenantId)))
      .limit(1);

    if (!project) return c.json({ error: 'Project not found' }, 404);

    // Fetch related client
    const [client] = project.clientId
      ? await db.select().from(schema.clients)
          .where(and(eq(schema.clients.id, project.clientId), eq(schema.clients.tenantId, user.tenantId)))
          .limit(1)
      : [null];

    // Fetch project team members
    const teamRows = await db.select().from(schema.projectTeam).where(eq(schema.projectTeam.projectId, projectId));
    const teamUserIds = teamRows.map(r => r.userId).filter(Boolean) as number[];
    const teamUsers = teamUserIds.length > 0
      ? await db.select({
          id: schema.users.id,
          name: schema.users.displayName,
          email: schema.users.email,
          profileImage: schema.users.profileImage
        })
        .from(schema.users)
        .where(and(inArray(schema.users.id, teamUserIds), eq(schema.users.tenantId, user.tenantId)))
      : [];

    // Fetch milestones
    const milestones = await db.select().from(schema.milestones)
      .where(and(eq(schema.milestones.tenantId, user.tenantId), eq(schema.milestones.projectId, projectId)))
      .orderBy(schema.milestones.orderIndex, schema.milestones.id);

    // Fetch tasks
    const tasksList = await db.select().from(schema.tasks)
      .where(and(
        eq(schema.tasks.tenantId, user.tenantId),
        eq(schema.tasks.projectId, projectId),
        isNull(schema.tasks.deletedAt)
      ))
      .orderBy(schema.tasks.orderIndex, desc(schema.tasks.createdAt));

    // Enrich tasks with assignees and milestone title
    const assignedUserIds = [...new Set(tasksList.map(t => t.assignedTo).filter(Boolean))] as number[];
    const usersMap = new Map<number, { id: number; name: string; email: string; profileImage: string | null }>();
    if (assignedUserIds.length > 0) {
      const uRows = await db.select({
        id: schema.users.id,
        name: schema.users.displayName,
        email: schema.users.email,
        profileImage: schema.users.profileImage
      })
      .from(schema.users)
      .where(and(inArray(schema.users.id, assignedUserIds), eq(schema.users.tenantId, user.tenantId)));
      for (const u of uRows) usersMap.set(u.id, u);
    }

    const milestonesMap = new Map<number, { id: number; title: string }>();
    for (const m of milestones) milestonesMap.set(m.id, m);

    const tasks = tasksList.map(t => ({
      ...t,
      assignee: t.assignedTo ? usersMap.get(t.assignedTo) || null : null,
      milestone: t.milestoneId ? milestonesMap.get(t.milestoneId) || null : null,
      subtasksCount: Array.isArray(t.subtasks) ? (t.subtasks as any[]).length : 0,
      completedSubtasksCount: Array.isArray(t.subtasks) ? (t.subtasks as any[]).filter(st => st.completed).length : 0
    }));

    // Fetch files
    const files = await db.select().from(schema.files)
      .where(and(eq(schema.files.projectId, projectId), eq(schema.files.tenantId, user.tenantId)))
      .orderBy(desc(schema.files.uploadedAt));

    return c.json({ project: { ...project, client }, milestones, tasks, files, teamUsers });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

projectsRoutes.post('/', requireAdmin, async (c) => {
  const admin = c.get('user');
  const data = await c.req.json();
  const db = c.get('db');

  try {
    const [newProject] = await db.insert(schema.projects).values({
      tenantId: admin.tenantId,
      clientId: data.clientId,
      title: data.title,
      description: data.description,
      status: data.status || 'active',
      priority: data.priority || 'medium',
      startDate: data.startDate ? data.startDate.split('T')[0] : null,
      deadline: data.deadline ? data.deadline.split('T')[0] : null,
      createdBy: parseInt(admin.sub as string),
    }).returning({ id: schema.projects.id });

    if (!newProject) return c.json({ error: 'Failed to create project' }, 500);
    const projectId = newProject.id;

    if (data.teamMembers && data.teamMembers.length > 0) {
      await db.insert(schema.projectTeam).values(data.teamMembers.map((userId: number) => ({
        projectId: projectId,
        userId: userId,
      })));
    }

    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: `Project '${data.title}' created.`,
    });

    return c.json({ success: true, projectId });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

projectsRoutes.put('/:id', requireAdmin, async (c) => {
  const admin = c.get('user');
  const projectId = parseInt(c.req.param('id'));
  const data = await c.req.json();
  const db = c.get('db');

  try {
    await db.update(schema.projects).set({
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      clientId: data.clientId,
      startDate: data.startDate ? data.startDate.split('T')[0] : undefined,
      deadline: data.deadline ? data.deadline.split('T')[0] : undefined,
      completionDate: data.completionDate ? data.completionDate.split('T')[0] : undefined,
      updatedAt: new Date().toISOString()
    }).where(and(eq(schema.projects.id, projectId), eq(schema.projects.tenantId, admin.tenantId)));

    if (data.teamMembers) {
      await db.delete(schema.projectTeam).where(eq(schema.projectTeam.projectId, projectId));
      if (data.teamMembers.length > 0) {
        await db.insert(schema.projectTeam).values(data.teamMembers.map((userId: number) => ({
          projectId: projectId,
          userId: userId,
        })));
      }
    }

    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: `Project ID ${projectId} updated.`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

projectsRoutes.delete('/:id', requireAdmin, async (c) => {
  const admin = c.get('user');
  const projectId = parseInt(c.req.param('id'));
  const db = c.get('db');
  
  try {
    await db.delete(schema.tasks).where(and(eq(schema.tasks.projectId, projectId), eq(schema.tasks.tenantId, admin.tenantId)));
    await db.delete(schema.milestones).where(and(eq(schema.milestones.projectId, projectId), eq(schema.milestones.tenantId, admin.tenantId)));
    await db.delete(schema.projectTeam).where(eq(schema.projectTeam.projectId, projectId));
    
    await db.delete(schema.projects).where(and(eq(schema.projects.id, projectId), eq(schema.projects.tenantId, admin.tenantId)));
    
    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: `Project ID ${projectId} deleted.`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ==========================================
// AI BREAKDOWN & ASSISTANT ENDPOINTS
// ==========================================

/**
 * POST /api/projects/:id/ai/breakdown
 * Automatically decomposes project scope into structured milestones & actionable tasks
 */
projectsRoutes.post('/:id/ai/breakdown', async (c) => {
  const user = c.get('user');
  const projectId = parseInt(c.req.param('id'));
  const db = c.get('db');
  const body = await c.req.json().catch(() => ({}));

  if (isNaN(projectId)) {
    return c.json({ error: 'Invalid project ID' }, 400);
  }

  try {
    const [project] = await db.select().from(schema.projects)
      .where(and(eq(schema.projects.id, projectId), eq(schema.projects.tenantId, user.tenantId)))
      .limit(1);

    if (!project) return c.json({ error: 'Project not found' }, 404);

    const [client] = project.clientId
      ? await db.select().from(schema.clients)
          .where(and(eq(schema.clients.id, project.clientId), eq(schema.clients.tenantId, user.tenantId)))
          .limit(1)
      : [null];

    const existingMilestones = await db.select({ title: schema.milestones.title, status: schema.milestones.status })
      .from(schema.milestones)
      .where(and(eq(schema.milestones.projectId, projectId), eq(schema.milestones.tenantId, user.tenantId)));

    const existingTasks = await db.select({ title: schema.tasks.title, status: schema.tasks.status })
      .from(schema.tasks)
      .where(and(
        eq(schema.tasks.projectId, projectId),
        eq(schema.tasks.tenantId, user.tenantId),
        isNull(schema.tasks.deletedAt)
      ));

    const teamRows = await db.select().from(schema.projectTeam).where(eq(schema.projectTeam.projectId, projectId));
    const teamUserIds = teamRows.map(r => r.userId).filter(Boolean) as number[];
    const teamUsers = teamUserIds.length > 0
      ? await db.select({ name: schema.users.displayName, email: schema.users.email })
          .from(schema.users)
          .where(and(inArray(schema.users.id, teamUserIds), eq(schema.users.tenantId, user.tenantId)))
      : [];

    const apiKey = await getGeminiApiKey(c, db, user.tenantId);

    const breakdown = await generateProjectBreakdown(
      apiKey,
      {
        id: project.id,
        title: project.title,
        description: project.description,
        clientName: client?.companyName || null,
        startDate: project.startDate,
        deadline: project.deadline,
        existingMilestones,
        existingTasks,
        teamMembers: teamUsers
      },
      body.customInstructions
    );

    return c.json({ success: true, breakdown });
  } catch (error: any) {
    console.error('Error generating AI breakdown:', error);
    return c.json({ error: error.message || 'Failed to generate AI breakdown' }, 500);
  }
});

/**
 * POST /api/projects/:id/ai/chat
 * Multi-turn conversational chat with the Project AI Assistant
 */
projectsRoutes.post('/:id/ai/chat', async (c) => {
  const user = c.get('user');
  const projectId = parseInt(c.req.param('id'));
  const db = c.get('db');
  const { message, history, currentBreakdown } = await c.req.json();

  if (isNaN(projectId) || !message?.trim()) {
    return c.json({ error: 'Valid projectId and message are required' }, 400);
  }

  try {
    const [project] = await db.select().from(schema.projects)
      .where(and(eq(schema.projects.id, projectId), eq(schema.projects.tenantId, user.tenantId)))
      .limit(1);

    if (!project) return c.json({ error: 'Project not found' }, 404);

    const [client] = project.clientId
      ? await db.select().from(schema.clients)
          .where(and(eq(schema.clients.id, project.clientId), eq(schema.clients.tenantId, user.tenantId)))
          .limit(1)
      : [null];

    const apiKey = await getGeminiApiKey(c, db, user.tenantId);

    const response = await chatWithProjectAssistant(
      apiKey,
      {
        id: project.id,
        title: project.title,
        description: project.description,
        clientName: client?.companyName || null,
        startDate: project.startDate,
        deadline: project.deadline
      },
      message.trim(),
      Array.isArray(history) ? history : [],
      currentBreakdown
    );

    return c.json({ success: true, ...response });
  } catch (error: any) {
    console.error('Error in AI chat:', error);
    return c.json({ error: error.message || 'Failed to process AI chat message' }, 500);
  }
});

/**
 * POST /api/projects/:id/ai/apply
 * Commits approved milestones and tasks directly into the project board
 */
projectsRoutes.post('/:id/ai/apply', async (c) => {
  const user = c.get('user');
  const projectId = parseInt(c.req.param('id'));
  const db = c.get('db');
  const { milestones: proposedMilestones } = await c.req.json();

  if (isNaN(projectId) || !Array.isArray(proposedMilestones) || proposedMilestones.length === 0) {
    return c.json({ error: 'A non-empty milestones array is required' }, 400);
  }

  try {
    const [project] = await db.select().from(schema.projects)
      .where(and(eq(schema.projects.id, projectId), eq(schema.projects.tenantId, user.tenantId)))
      .limit(1);

    if (!project) return c.json({ error: 'Project not found' }, 404);

    let totalTasksCreated = 0;
    let totalMilestonesCreated = 0;

    for (let mIdx = 0; mIdx < proposedMilestones.length; mIdx++) {
      const m = proposedMilestones[mIdx];
      if (!m.title?.trim()) continue;

      // Check if milestone with same title already exists
      let [milestoneRecord] = await db.select().from(schema.milestones)
        .where(and(
          eq(schema.milestones.tenantId, user.tenantId),
          eq(schema.milestones.projectId, projectId),
          eq(schema.milestones.title, m.title.trim())
        ))
        .limit(1);

      if (!milestoneRecord) {
        const [createdM] = await db.insert(schema.milestones).values({
          tenantId: user.tenantId,
          projectId,
          title: m.title.trim(),
          description: m.description || null,
          orderIndex: mIdx,
          status: 'pending'
        }).returning();
        milestoneRecord = createdM;
        totalMilestonesCreated++;
      }

      // Insert tasks under this milestone
      if (Array.isArray(m.tasks)) {
        for (let tIdx = 0; tIdx < m.tasks.length; tIdx++) {
          const t = m.tasks[tIdx];
          if (!t.title?.trim()) continue;

          const subtasksJson = (t.subtasks || []).map((st: any, sIdx: number) => ({
            id: `sub_${Date.now()}_${mIdx}_${tIdx}_${sIdx}`,
            title: typeof st === 'string' ? st : (st.title || String(st)),
            completed: false
          }));

          await db.insert(schema.tasks).values({
            tenantId: user.tenantId,
            projectId,
            milestoneId: milestoneRecord.id,
            title: t.title.trim(),
            description: t.description || null,
            status: 'todo',
            priority: ['low', 'medium', 'high', 'urgent'].includes(t.priority?.toLowerCase())
              ? t.priority.toLowerCase()
              : 'medium',
            estimatedHours: t.estimatedHours ? Number(t.estimatedHours).toFixed(2) : '4.00',
            subtasks: subtasksJson,
            orderIndex: tIdx
          });
          totalTasksCreated++;
        }
      }
    }

    await db.insert(schema.activityLogs).values({
      tenantId: user.tenantId,
      userId: parseInt(user.sub as string),
      action: `Applied AI project breakdown: ${totalTasksCreated} tasks created across ${proposedMilestones.length} milestones.`,
    });

    return c.json({
      success: true,
      milestonesCreated: totalMilestonesCreated,
      tasksCreated: totalTasksCreated
    });
  } catch (error: any) {
    console.error('Error applying AI breakdown:', error);
    return c.json({ error: error.message || 'Failed to apply AI breakdown' }, 500);
  }
});

export default projectsRoutes;
