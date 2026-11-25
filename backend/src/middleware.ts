import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';
import { getCookie } from 'hono/cookie';
import {
  AccessLevel,
  AuthUser,
  ModuleKey,
  hasPermission,
  hydrateAuthUser,
  isInternalStaff,
} from './lib/permissions';

export const requireAuth = createMiddleware(async (c, next) => {
  const token = getCookie(c, 'auth_token');
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET as string, 'HS256') as any;
    const userId = payload.id ? Number(payload.id) : payload.sub ? Number(payload.sub) : NaN;
    if (!Number.isInteger(userId) || userId <= 0) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    const db = c.get('db');
    if (!db) {
      return c.json({ error: 'Database unavailable' }, 500);
    }

    const hydratedUser = await hydrateAuthUser(db, userId);
    if (!hydratedUser) {
      return c.json({ error: 'Account inactive or not found' }, 401);
    }

    c.set('user', hydratedUser);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

export const requireAdmin = createMiddleware(async (c, next) => {
  const user = c.get('user') as AuthUser | undefined;
  if (!user || user.role !== 'administrator') {
    return c.json({ error: 'Forbidden: Admin only' }, 403);
  }
  await next();
});

export const requireInternalStaff = createMiddleware(async (c, next) => {
  const user = c.get('user') as AuthUser | undefined;
  if (!isInternalStaff(user)) {
    return c.json({ error: 'Forbidden: Internal staff only' }, 403);
  }
  await next();
});

export const requirePermission = (moduleKey: ModuleKey, minLevel: AccessLevel = 'view') =>
  createMiddleware(async (c, next) => {
    const user = c.get('user') as AuthUser | undefined;
    if (!hasPermission(user, moduleKey, minLevel)) {
      return c.json(
        { error: `Forbidden: Requires '${moduleKey}' (${minLevel}) access` },
        403
      );
    }
    await next();
  });

export const requireAnyPermission = (
  checks: Array<{ module: ModuleKey; minLevel?: AccessLevel }>
) =>
  createMiddleware(async (c, next) => {
    const user = c.get('user') as AuthUser | undefined;
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (user.role === 'administrator') {
      await next();
      return;
    }

    const allowed = checks.some((chk) =>
      hasPermission(user, chk.module, chk.minLevel || 'view')
    );

    if (!allowed) {
      return c.json({ error: 'Forbidden: Missing required module access' }, 403);
    }
    await next();
  });
