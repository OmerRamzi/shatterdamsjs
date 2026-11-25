import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import * as schema from '../db/schema';
import { eq, inArray, and, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import {
  AuthUser,
  AccessLevel,
  DataScope,
  ModuleKey,
  isValidAccessLevel,
  isValidDataScope,
  isValidModuleKey,
} from '../lib/permissions';

const teamRoutes = new Hono<{
  Bindings: { DATABASE_URL: string };
  Variables: { user: AuthUser; db: any };
}>();

teamRoutes.use('*', requireAuth, requireAdmin);

const ALLOWED_TEAM_ROLES = ['administrator', 'employee', 'freelancer'] as const;

interface NormalizedPermissionInput {
  moduleKey: ModuleKey;
  accessLevel: AccessLevel;
  scope: DataScope;
}

function normalizePermissionsInput(raw: any): {
  items: NormalizedPermissionInput[];
  error?: string;
} {
  if (raw === undefined || raw === null) return { items: [] };
  if (!Array.isArray(raw)) {
    return { items: [], error: 'permissions must be an array' };
  }
  const byModule = new Map<ModuleKey, NormalizedPermissionInput>();

  for (const item of raw) {
    if (!item || typeof item.moduleKey !== 'string' || !isValidModuleKey(item.moduleKey)) {
      return {
        items: [],
        error: `Invalid moduleKey: ${String(item?.moduleKey ?? '')}`,
      };
    }

    if (item.accessLevel !== undefined && (typeof item.accessLevel !== 'string' || !isValidAccessLevel(item.accessLevel))) {
      return {
        items: [],
        error: `Invalid accessLevel for ${item.moduleKey}: ${String(item.accessLevel)}`,
      };
    }

    if (item.scope !== undefined && (typeof item.scope !== 'string' || !isValidDataScope(item.scope))) {
      return {
        items: [],
        error: `Invalid scope for ${item.moduleKey}: ${String(item.scope)}`,
      };
    }

    const level: AccessLevel = item.accessLevel || 'manage';
    const scope: DataScope = item.scope || 'all';

    byModule.set(item.moduleKey, {
      moduleKey: item.moduleKey,
      accessLevel: level,
      scope,
    });
  }

  return { items: Array.from(byModule.values()) };
}

teamRoutes.get('/', async (c) => {
  const admin = c.get('user');
  const db = c.get('db');

  try {
    const teamUsers = await db
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
        role: schema.userRoles.role,
      })
      .from(schema.users)
      .innerJoin(schema.userRoles, eq(schema.users.id, schema.userRoles.userId))
      .where(
        and(
          eq(schema.users.tenantId, admin.tenantId),
          isNull(schema.users.deletedAt),
          inArray(schema.userRoles.role, ['employee', 'freelancer', 'administrator'])
        )
      );

    if (teamUsers.length === 0) return c.json([]);

    const userIds = teamUsers.map((u: any) => u.id);
    const permissionRows = await db
      .select({
        userId: schema.userModulePermissions.userId,
        moduleKey: schema.userModulePermissions.moduleKey,
        accessLevel: schema.userModulePermissions.accessLevel,
        scope: schema.userModulePermissions.scope,
      })
      .from(schema.userModulePermissions)
      .where(
        and(
          eq(schema.userModulePermissions.tenantId, admin.tenantId),
          inArray(schema.userModulePermissions.userId, userIds)
        )
      );

    const permsByUser = new Map<number, any[]>();
    for (const row of permissionRows) {
      const list = permsByUser.get(row.userId) || [];
      list.push({
        moduleKey: row.moduleKey,
        accessLevel: row.accessLevel,
        scope: row.scope,
      });
      permsByUser.set(row.userId, list);
    }

    const formatted = teamUsers.map((u: any) => ({
      ...u,
      permissions: permsByUser.get(u.id) || [],
    }));

    return c.json(formatted);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

teamRoutes.post('/', async (c) => {
  const admin = c.get('user');
  const data = await c.req.json();
  const db = c.get('db');

  if (!data.email?.trim() || !data.displayName?.trim()) {
    return c.json({ error: 'Display name and email are required' }, 400);
  }

  const targetRole = ALLOWED_TEAM_ROLES.includes(data.role) ? data.role : 'employee';
  const permParse =
    targetRole === 'administrator'
      ? { items: [] }
      : normalizePermissionsInput(data.permissions);
  if (permParse.error) {
    return c.json({ error: permParse.error }, 400);
  }
  const normalizedPerms = permParse.items;

  try {
    const [existingEmail] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, data.email.trim()))
      .limit(1);

    if (existingEmail) {
      return c.json({ error: 'A user with this email already exists' }, 409);
    }

    const defaultPassword = 'Team@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const createdUserId = await db.transaction(async (tx: any) => {
      const [newUser] = await tx
        .insert(schema.users)
        .values({
          tenantId: admin.tenantId,
          email: data.email.trim(),
          passwordHash,
          displayName: data.displayName.trim(),
          phone: data.phone || null,
          preferredLocale: 'en',
        })
        .returning({ id: schema.users.id });

      if (!newUser) throw new Error('Failed to create user');

      await tx.insert(schema.userRoles).values({
        userId: newUser.id,
        role: targetRole,
      });

      if (normalizedPerms.length > 0) {
        await tx.insert(schema.userModulePermissions).values(
          normalizedPerms.map((p) => ({
            tenantId: admin.tenantId,
            userId: newUser.id,
            moduleKey: p.moduleKey,
            accessLevel: p.accessLevel,
            scope: p.scope,
            grantedBy: admin.id,
          }))
        );
      }

      await tx.insert(schema.activityLogs).values({
        tenantId: admin.tenantId,
        userId: admin.id,
        entityType: 'user',
        entityId: newUser.id,
        action: `Team member '${data.displayName.trim()}' added as ${targetRole}.`,
      });

      return newUser.id;
    });

    return c.json({ success: true, id: createdUserId });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

teamRoutes.put('/:id', async (c) => {
  const admin = c.get('user');
  const userIdToUpdate = parseInt(c.req.param('id'), 10);
  const data = await c.req.json();
  const db = c.get('db');

  if (isNaN(userIdToUpdate)) {
    return c.json({ error: 'Invalid user ID' }, 400);
  }

  try {
    const [existingUser] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.id, userIdToUpdate),
          eq(schema.users.tenantId, admin.tenantId),
          isNull(schema.users.deletedAt)
        )
      )
      .limit(1);

    if (!existingUser) return c.json({ error: 'User not found or unauthorized' }, 404);

    if (data.role && !ALLOWED_TEAM_ROLES.includes(data.role)) {
      return c.json({ error: 'Invalid team role' }, 400);
    }

    if (userIdToUpdate === admin.id && data.role && data.role !== 'administrator') {
      return c.json({ error: 'Cannot remove your own administrator role' }, 400);
    }

    await db.transaction(async (tx: any) => {
      const updateFields: Record<string, any> = {
        updatedAt: new Date().toISOString(),
      };
      if (data.displayName !== undefined) updateFields.displayName = data.displayName;
      if (data.phone !== undefined) updateFields.phone = data.phone;
      if (data.isActive !== undefined && userIdToUpdate !== admin.id) {
        updateFields.isActive = Boolean(data.isActive);
      }

      await tx
        .update(schema.users)
        .set(updateFields)
        .where(
          and(
            eq(schema.users.id, userIdToUpdate),
            eq(schema.users.tenantId, admin.tenantId)
          )
        );

      if (data.role) {
        await tx
          .update(schema.userRoles)
          .set({ role: data.role })
          .where(eq(schema.userRoles.userId, userIdToUpdate));

        if (data.role === 'administrator') {
          await tx
            .delete(schema.userModulePermissions)
            .where(
              and(
                eq(schema.userModulePermissions.tenantId, admin.tenantId),
                eq(schema.userModulePermissions.userId, userIdToUpdate)
              )
            );
        }
      }

      await tx.insert(schema.activityLogs).values({
        tenantId: admin.tenantId,
        userId: admin.id,
        entityType: 'user',
        entityId: userIdToUpdate,
        action: `Team member '${data.displayName || userIdToUpdate}' updated.`,
      });
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

teamRoutes.delete('/:id', async (c) => {
  const admin = c.get('user');
  const userIdToDelete = parseInt(c.req.param('id'), 10);
  const db = c.get('db');

  if (isNaN(userIdToDelete)) {
    return c.json({ error: 'Invalid user ID' }, 400);
  }

  if (userIdToDelete === admin.id) {
    return c.json({ error: 'Cannot delete your own administrator account' }, 400);
  }

  try {
    const [existingUser] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.id, userIdToDelete),
          eq(schema.users.tenantId, admin.tenantId)
        )
      )
      .limit(1);

    if (!existingUser) return c.json({ error: 'User not found or unauthorized' }, 404);

    await db.transaction(async (tx: any) => {
      await tx
        .delete(schema.userModulePermissions)
        .where(
          and(
            eq(schema.userModulePermissions.tenantId, admin.tenantId),
            eq(schema.userModulePermissions.userId, userIdToDelete)
          )
        );
      await tx.delete(schema.userRoles).where(eq(schema.userRoles.userId, userIdToDelete));
      await tx
        .delete(schema.users)
        .where(
          and(
            eq(schema.users.id, userIdToDelete),
            eq(schema.users.tenantId, admin.tenantId)
          )
        );

      await tx.insert(schema.activityLogs).values({
        tenantId: admin.tenantId,
        userId: admin.id,
        entityType: 'user',
        entityId: userIdToDelete,
        action: `Team member ID ${userIdToDelete} deleted.`,
      });
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/team/:id/permissions
 * Fetch module permissions for a specific team member.
 */
teamRoutes.get('/:id/permissions', async (c) => {
  const admin = c.get('user');
  const targetUserId = parseInt(c.req.param('id'), 10);
  const db = c.get('db');

  if (isNaN(targetUserId)) {
    return c.json({ error: 'Invalid user ID' }, 400);
  }

  try {
    const [targetUser] = await db
      .select({
        id: schema.users.id,
        displayName: schema.users.displayName,
        email: schema.users.email,
        role: schema.userRoles.role,
      })
      .from(schema.users)
      .innerJoin(schema.userRoles, eq(schema.users.id, schema.userRoles.userId))
      .where(
        and(
          eq(schema.users.id, targetUserId),
          eq(schema.users.tenantId, admin.tenantId),
          isNull(schema.users.deletedAt)
        )
      )
      .limit(1);

    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const rows = await db
      .select({
        moduleKey: schema.userModulePermissions.moduleKey,
        accessLevel: schema.userModulePermissions.accessLevel,
        scope: schema.userModulePermissions.scope,
      })
      .from(schema.userModulePermissions)
      .where(
        and(
          eq(schema.userModulePermissions.tenantId, admin.tenantId),
          eq(schema.userModulePermissions.userId, targetUserId)
        )
      );

    return c.json({
      user: targetUser,
      permissions: rows,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /api/team/:id/permissions
 * Atomically updates a staff member's granted module permissions.
 */
teamRoutes.put('/:id/permissions', async (c) => {
  const admin = c.get('user');
  const targetUserId = parseInt(c.req.param('id'), 10);
  const body = await c.req.json();
  const db = c.get('db');

  if (isNaN(targetUserId)) {
    return c.json({ error: 'Invalid user ID' }, 400);
  }

  if (!Array.isArray(body?.permissions)) {
    return c.json({ error: 'permissions array is required' }, 400);
  }

  try {
    const [targetUser] = await db
      .select({
        id: schema.users.id,
        displayName: schema.users.displayName,
        role: schema.userRoles.role,
      })
      .from(schema.users)
      .innerJoin(schema.userRoles, eq(schema.users.id, schema.userRoles.userId))
      .where(
        and(
          eq(schema.users.id, targetUserId),
          eq(schema.users.tenantId, admin.tenantId),
          isNull(schema.users.deletedAt)
        )
      )
      .limit(1);

    if (!targetUser) {
      return c.json({ error: 'Team member not found' }, 404);
    }

    if (targetUser.role === 'client') {
      return c.json(
        { error: 'Client portal accounts cannot be granted internal modules' },
        400
      );
    }

    if (targetUser.role === 'administrator') {
      return c.json(
        { error: 'Administrators already have full access to all modules' },
        400
      );
    }

    const permParse = normalizePermissionsInput(body.permissions);
    if (permParse.error) {
      return c.json({ error: permParse.error }, 400);
    }
    const normalized = permParse.items;

    await db.transaction(async (tx: any) => {
      await tx
        .delete(schema.userModulePermissions)
        .where(
          and(
            eq(schema.userModulePermissions.tenantId, admin.tenantId),
            eq(schema.userModulePermissions.userId, targetUserId)
          )
        );

      if (normalized.length > 0) {
        await tx.insert(schema.userModulePermissions).values(
          normalized.map((p) => ({
            tenantId: admin.tenantId,
            userId: targetUserId,
            moduleKey: p.moduleKey,
            accessLevel: p.accessLevel,
            scope: p.scope,
            grantedBy: admin.id,
          }))
        );
      }

      const summary =
        normalized.length > 0
          ? normalized
              .map((p) => `${p.moduleKey}:${p.accessLevel}(${p.scope})`)
              .join(', ')
          : 'none';

      await tx.insert(schema.activityLogs).values({
        tenantId: admin.tenantId,
        userId: admin.id,
        entityType: 'user_permissions',
        entityId: targetUserId,
        action: `Updated module access for ${targetUser.displayName}`,
        description: `Modules: ${summary}`,
      });
    });

    return c.json({ success: true, permissions: normalized });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default teamRoutes;
