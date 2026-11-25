import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import * as schema from '../db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { AuthUser } from '../lib/permissions';

const router = new Hono<{
  Bindings: { DATABASE_URL: string };
  Variables: { user: AuthUser; db: any };
}>();

router.use('*', requireAuth, requireAdmin);

router.get('/', async (c) => {
  const user = c.get('user');
  const db = c.get('db');

  try {
    const allUsers = await db
      .select({
        id: schema.users.id,
        tenantId: schema.users.tenantId,
        email: schema.users.email,
        displayName: schema.users.displayName,
        phone: schema.users.phone,
        isActive: schema.users.isActive,
        lastLoginAt: schema.users.lastLoginAt,
        profileImage: schema.users.profileImage,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.tenantId, user.tenantId));

    if (allUsers.length === 0) return c.json([]);

    const userIds = allUsers.map((u: any) => u.id);

    const [roles, permRows] = await Promise.all([
      db
        .select({
          userId: schema.userRoles.userId,
          role: schema.userRoles.role,
        })
        .from(schema.userRoles)
        .where(inArray(schema.userRoles.userId, userIds)),
      db
        .select({
          userId: schema.userModulePermissions.userId,
          moduleKey: schema.userModulePermissions.moduleKey,
          accessLevel: schema.userModulePermissions.accessLevel,
          scope: schema.userModulePermissions.scope,
        })
        .from(schema.userModulePermissions)
        .where(
          and(
            eq(schema.userModulePermissions.tenantId, user.tenantId),
            inArray(schema.userModulePermissions.userId, userIds)
          )
        ),
    ]);

    const permsMap = new Map<number, any[]>();
    for (const p of permRows) {
      const list = permsMap.get(p.userId) || [];
      list.push({
        moduleKey: p.moduleKey,
        accessLevel: p.accessLevel,
        scope: p.scope,
      });
      permsMap.set(p.userId, list);
    }

    const usersWithRoles = allUsers.map((u: any) => ({
      ...u,
      role: roles.find((r: any) => r.userId === u.id)?.role || 'unknown',
      permissions: permsMap.get(u.id) || [],
    }));

    return c.json(usersWithRoles);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default router;
