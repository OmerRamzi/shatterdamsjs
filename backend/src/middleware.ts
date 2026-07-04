import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';
import { getCookie } from 'hono/cookie';

export const requireAuth = createMiddleware(async (c, next) => {
  const token = getCookie(c, 'auth_token');
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET as string, "HS256");
    c.set('user', payload);
    await next();
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

export const requireAdmin = createMiddleware(async (c, next) => {
  const user = c.get('user');
  if (!user || user.role !== 'administrator') {
    return c.json({ error: 'Forbidden: Admin only' }, 403);
  }
  await next();
});
