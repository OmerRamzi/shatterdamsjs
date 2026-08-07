import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import * as schema from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const commissionsRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any } }>();

commissionsRoutes.use('*', requireAuth);

// Get all commissions
commissionsRoutes.get('/', requireAdmin, async (c) => {
  const admin = c.get('user');
  const search = c.req.query('search');
  const status = c.req.query('status');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const db = c.get('db');
  
  try {
    let conditions = [eq(schema.commissions.tenantId, admin.tenantId)];
    
    if (status) conditions.push(eq(schema.commissions.status, status));
    if (from) conditions.push(sql`${schema.commissions.date} >= ${from}`);
    if (to) conditions.push(sql`${schema.commissions.date} <= ${to}`);
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(sql`(${schema.commissions.source} ILIKE ${searchPattern} OR ${schema.commissions.notes} ILIKE ${searchPattern})`);
    }

    const offset = (page - 1) * limit;

    const [countRes] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(schema.commissions)
      .where(and(...conditions));
    const total = countRes.count;

    const records = await db.select({
      commission: schema.commissions,
      client: schema.clients,
      project: schema.projects
    })
    .from(schema.commissions)
    .leftJoin(schema.clients, eq(schema.commissions.clientId, schema.clients.id))
    .leftJoin(schema.projects, eq(schema.commissions.projectId, schema.projects.id))
    .where(and(...conditions))
    .orderBy(desc(schema.commissions.date))
    .limit(limit)
    .offset(offset);
    
    return c.json({ data: records, total, page, limit });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create manual commission
commissionsRoutes.post('/', requireAdmin, async (c) => {
  const admin = c.get('user');
  const data = await c.req.json();
  const db = c.get('db');

  try {
    // Validate tenant ownership
    if (data.clientId) {
      const [clientCheck] = await db.select({ id: schema.clients.id }).from(schema.clients).where(and(eq(schema.clients.id, data.clientId), eq(schema.clients.tenantId, admin.tenantId))).limit(1);
      if (!clientCheck) return c.json({ error: 'Invalid client association' }, 403);
    }
    
    if (data.projectId) {
      const [projectCheck] = await db.select({ id: schema.projects.id }).from(schema.projects).where(and(eq(schema.projects.id, data.projectId), eq(schema.projects.tenantId, admin.tenantId))).limit(1);
      if (!projectCheck) return c.json({ error: 'Invalid project association' }, 403);
    }

    const [newCommission] = await db.insert(schema.commissions).values({
      tenantId: admin.tenantId,
      clientId: data.clientId || null,
      projectId: data.projectId || null,
      source: data.source || 'Manual',
      amount: data.amount,
      currency: data.currency || 'USD',
      date: data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: data.status || 'pending',
      referenceId: data.referenceId || null,
      notes: data.notes || null,
    }).returning({ id: schema.commissions.id });

    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: `Logged manual commission from ${data.source || 'Manual'}`,
    });

    return c.json({ success: true, commissionId: newCommission.id }, 201);
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update commission status
commissionsRoutes.put('/:id/status', requireAdmin, async (c) => {
  const admin = c.get('user');
  const commissionId = parseInt(c.req.param('id'));
  const { status } = await c.req.json();
  const db = c.get('db');

  try {
    await db.update(schema.commissions)
      .set({ status })
      .where(and(eq(schema.commissions.id, commissionId), eq(schema.commissions.tenantId, admin.tenantId)));

    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete commission
commissionsRoutes.delete('/:id', requireAdmin, async (c) => {
  const admin = c.get('user');
  const commissionId = parseInt(c.req.param('id'));
  const db = c.get('db');

  try {
    await db.delete(schema.commissions)
      .where(and(eq(schema.commissions.id, commissionId), eq(schema.commissions.tenantId, admin.tenantId)));
    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get Webhook Secret
commissionsRoutes.get('/webhook-secret', requireAdmin, async (c) => {
  const admin = c.get('user');
  const db = c.get('db');
  
  try {
    let [setting] = await db.select().from(schema.settings)
      .where(and(eq(schema.settings.tenantId, admin.tenantId), eq(schema.settings.settingKey, 'webhook_secret'))).limit(1);
      
    if (!setting) {
      // Generate one if it doesn't exist
      const crypto = globalThis.crypto || await import('node:crypto');
      const newSecret = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      
      [setting] = await db.insert(schema.settings).values({
        tenantId: admin.tenantId,
        settingKey: 'webhook_secret',
        settingValue: newSecret
      }).returning();
    }
    
    const maskedSecret = setting.settingValue ? setting.settingValue.substring(0, 4) + '...***...' + setting.settingValue.substring(setting.settingValue.length - 4) : '';
    return c.json({ secret: maskedSecret, tenantId: admin.tenantId });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Regenerate Webhook Secret
commissionsRoutes.post('/webhook-secret/regenerate', requireAdmin, async (c) => {
  const admin = c.get('user');
  const db = c.get('db');
  
  try {
    const crypto = globalThis.crypto || await import('node:crypto');
    const newSecret = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    
    const [setting] = await db.select().from(schema.settings)
      .where(and(eq(schema.settings.tenantId, admin.tenantId), eq(schema.settings.settingKey, 'webhook_secret'))).limit(1);

    if (setting) {
      await db.update(schema.settings).set({ settingValue: newSecret })
        .where(eq(schema.settings.id, setting.id));
    } else {
      await db.insert(schema.settings).values({
        tenantId: admin.tenantId,
        settingKey: 'webhook_secret',
        settingValue: newSecret
      });
    }
    
    return c.json({ secret: newSecret, tenantId: admin.tenantId });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default commissionsRoutes;
