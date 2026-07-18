import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import * as schema from '../db/schema';
import { eq, desc } from 'drizzle-orm';

const activityRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any } }>();

activityRoutes.use('*', requireAuth);

activityRoutes.get('/', async (c) => {
  const user = c.get('user');
  const limit = parseInt(c.req.query('limit') || '10', 10);
  const db = c.get('db');

  try {
    const data = await db.select({
      id: schema.activityLogs.id,
      action: schema.activityLogs.action,
      createdAt: schema.activityLogs.createdAt,
      user: {
        id: schema.users.id,
        displayName: schema.users.displayName
      }
    })
    .from(schema.activityLogs)
    .leftJoin(schema.users, eq(schema.activityLogs.userId, schema.users.id))
    .where(eq(schema.activityLogs.tenantId, user.tenantId))
    .orderBy(desc(schema.activityLogs.createdAt))
    .limit(limit);

    return c.json(data);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default activityRoutes;
