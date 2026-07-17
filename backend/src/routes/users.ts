import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import { getDb } from '../db/client';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

const router = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any } }>();

router.use('*', requireAuth, requireAdmin);

router.get('/', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DATABASE_URL);

  try {
    const allUsers = await db.select().from(schema.users).where(eq(schema.users.tenantId, user.tenantId));
    const roles = await db.select().from(schema.userRoles);

    const usersWithRoles = allUsers.map(u => ({
      ...u,
      role: roles.find(r => r.userId === u.id)?.role || 'unknown'
    }));

    return c.json(usersWithRoles);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default router;
