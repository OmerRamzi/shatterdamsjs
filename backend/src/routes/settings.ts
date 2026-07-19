import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';

const settingsRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any } }>();

settingsRoutes.use('*', requireAuth, requireAdmin);

settingsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  
  try {
    const tenantSettings = await db.select({ key: schema.settings.settingKey, value: schema.settings.settingValue }).from(schema.settings).where(eq(schema.settings.tenantId, user.tenantId));
    const formattedSettings = tenantSettings.reduce((acc: any, curr: any) => {
      let val = curr.value;
      if (curr.key.includes('secret') || curr.key.includes('token') || curr.key.includes('password') || curr.key.includes('key')) {
        val = val ? '********' : '';
      }
      return { ...acc, [curr.key]: val };
    }, {});
    return c.json(formattedSettings);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

settingsRoutes.put('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();
  const db = c.get('db');

  try {
    for (const [key, value] of Object.entries(data)) {
      if (value === '********') continue; // Don't overwrite with masked string
      
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
