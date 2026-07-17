import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import { getDb } from '../db/client';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

const timesheetsRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any } }>();

timesheetsRoutes.use('*', requireAuth);

timesheetsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DATABASE_URL);
  
  try {
    const data = await db.select().from(schema.timesheets).where(eq(schema.timesheets.tenantId, user.tenantId));
    return c.json(data);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

timesheetsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();
  const db = getDb(c.env.DATABASE_URL);

  try {
    await db.insert(schema.timesheets).values({
      tenantId: user.tenantId,
      userId: parseInt(user.sub as string),
      projectId: data.projectId,
      date: data.date,
      hours: data.hours?.toString(),
      description: data.description
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default timesheetsRoutes;
