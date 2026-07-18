import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import * as schema from '../db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const teamRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any } }>();

teamRoutes.use('*', requireAuth, requireAdmin);

teamRoutes.get('/', async (c) => {
  const db = c.get('db');
  
  try {
    const roles = await db.select().from(schema.userRoles);

    const teamUserIds = roles
      .filter(r => r.role === 'employee' || r.role === 'freelancer' || r.role === 'administrator')
      .map(r => r.userId);

    if (teamUserIds.length === 0) return c.json([]);

    const team = await db.select().from(schema.users).where(inArray(schema.users.id, teamUserIds));
    
    const formatted = team.map(u => {
      const role = roles.find(r => r.userId === u.id)?.role;
      return { ...u, role };
    });

    return c.json(formatted);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

teamRoutes.post('/', async (c) => {
  const admin = c.get('user');
  const data = await c.req.json();
  const db = c.get('db');

  try {
    const defaultPassword = 'Team@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const [newUser] = await db.insert(schema.users).values({
      tenantId: admin.tenantId,
      email: data.email,
      passwordHash,
      displayName: data.displayName,
      phone: data.phone,
      preferredLocale: 'en',
    }).returning({ id: schema.users.id });

    if (!newUser) return c.json({ error: 'Failed to create user' }, 500);
    const userId = newUser.id;

    await db.insert(schema.userRoles).values({ userId, role: data.role });

    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: `Team member '${data.displayName}' added as ${data.role}.`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

teamRoutes.put('/:id', async (c) => {
  const admin = c.get('user');
  const userIdToUpdate = parseInt(c.req.param('id'));
  const data = await c.req.json();
  const db = c.get('db');

  try {
    const [existingUser] = await db.select({ id: schema.users.id }).from(schema.users)
      .where(and(eq(schema.users.id, userIdToUpdate), eq(schema.users.tenantId, admin.tenantId)))
      .limit(1);

    if (!existingUser) return c.json({ error: 'User not found or unauthorized' }, 404);

    await db.update(schema.users).set({
      displayName: data.displayName,
      phone: data.phone
    }).where(eq(schema.users.id, userIdToUpdate));

    if (data.role) {
      await db.update(schema.userRoles).set({ role: data.role }).where(eq(schema.userRoles.userId, userIdToUpdate));
    }

    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: `Team member '${data.displayName || userIdToUpdate}' updated.`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

teamRoutes.delete('/:id', async (c) => {
  const admin = c.get('user');
  const userIdToDelete = parseInt(c.req.param('id'));
  const db = c.get('db');
  
  try {
    const [existingUser] = await db.select({ id: schema.users.id }).from(schema.users)
      .where(and(eq(schema.users.id, userIdToDelete), eq(schema.users.tenantId, admin.tenantId)))
      .limit(1);

    if (!existingUser) return c.json({ error: 'User not found or unauthorized' }, 404);

    await db.delete(schema.userRoles).where(eq(schema.userRoles.userId, userIdToDelete));
    await db.delete(schema.users).where(eq(schema.users.id, userIdToDelete));
    
    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: `Team member ID ${userIdToDelete} deleted.`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default teamRoutes;
