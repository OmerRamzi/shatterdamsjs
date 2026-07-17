import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import { getDb } from '../db/client';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';

const settingsRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any } }>();

settingsRoutes.use('*', requireAuth, requireAdmin);

settingsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DATABASE_URL);
  
  try {
    const tenantSettings = await db.select({ key: schema.settings.settingKey, value: schema.settings.settingValue }).from(schema.settings).where(eq(schema.settings.tenantId, user.tenantId));
    const formattedSettings = tenantSettings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
    return c.json(formattedSettings);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

settingsRoutes.put('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();
  const db = getDb(c.env.DATABASE_URL);

  try {
    for (const [key, value] of Object.entries(data)) {
      const [existing] = await db.select().from(schema.settings).where(and(eq(schema.settings.tenantId, user.tenantId), eq(schema.settings.settingKey, key)));
      if (existing) {
        await db.update(schema.settings).set({ settingValue: value as string }).where(eq(schema.settings.id, existing.id));
      } else {
        await db.insert(schema.settings).values({ tenantId: user.tenantId, settingKey: key, settingValue: value as string });
      }
    }
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default settingsRoutes;
