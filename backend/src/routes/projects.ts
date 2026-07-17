import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import { getDb } from '../db/client';
import * as schema from '../db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

const projectsRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any } }>();

projectsRoutes.use('*', requireAuth);

projectsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DATABASE_URL);
  
  try {
    const data = await db.select().from(schema.projects)
      .where(eq(schema.projects.tenantId, user.tenantId))
      .orderBy(desc(schema.projects.createdAt));
      
    const clientIds = [...new Set(data.map(i => i.clientId).filter(Boolean))] as number[];
    const clients = clientIds.length > 0 ? await db.select().from(schema.clients).where(inArray(schema.clients.id, clientIds)) : [];

    const formatted = data.map((projectData) => {
      const client = clients.find(c => c.id === projectData.clientId) || null;
      return { ...projectData, client };
    });

    return c.json(formatted);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

projectsRoutes.post('/', requireAdmin, async (c) => {
  const admin = c.get('user');
  const data = await c.req.json();
  const db = getDb(c.env.DATABASE_URL);

  try {
    const [newProject] = await db.insert(schema.projects).values({
      tenantId: admin.tenantId,
      clientId: data.clientId,
      title: data.title,
      description: data.description,
      status: data.status || 'active',
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
  const db = getDb(c.env.DATABASE_URL);

  try {
    await db.update(schema.projects).set({
      title: data.title,
      description: data.description,
      status: data.status,
      clientId: data.clientId,
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
  const db = getDb(c.env.DATABASE_URL);
  
  try {
    await db.delete(schema.tasks).where(eq(schema.tasks.projectId, projectId));
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

export default projectsRoutes;
