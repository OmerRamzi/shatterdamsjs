import { Hono } from 'hono';
import { requireAdmin } from '../middleware';
import * as schema from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

const revenueRoutes = new Hono();

// Get all revenue streams
revenueRoutes.get('/streams', requireAdmin, async (c) => {
  const admin = c.get('user');
  const db = c.get('db');
  
  try {
    const streams = await db.select({
      stream: schema.revenueStreams,
      client: schema.clients,
      project: schema.projects
    })
    .from(schema.revenueStreams)
    .leftJoin(schema.clients, eq(schema.revenueStreams.clientId, schema.clients.id))
    .leftJoin(schema.projects, eq(schema.revenueStreams.projectId, schema.projects.id))
    .where(eq(schema.revenueStreams.tenantId, admin.tenantId))
    .orderBy(desc(schema.revenueStreams.createdAt));
    
    return c.json(streams);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Create a new revenue stream
revenueRoutes.post('/streams', requireAdmin, async (c) => {
  const admin = c.get('user');
  const data = await c.req.json();
  const db = c.get('db');

  try {
    // Validate tenant ownership
    const [clientCheck] = await db.select({ id: schema.clients.id }).from(schema.clients).where(and(eq(schema.clients.id, data.clientId), eq(schema.clients.tenantId, admin.tenantId))).limit(1);
    if (!clientCheck) return c.json({ error: 'Invalid client association' }, 403);
    
    if (data.projectId) {
      const [projectCheck] = await db.select({ id: schema.projects.id }).from(schema.projects).where(and(eq(schema.projects.id, data.projectId), eq(schema.projects.tenantId, admin.tenantId))).limit(1);
      if (!projectCheck) return c.json({ error: 'Invalid project association' }, 403);
    }

    const [newStream] = await db.insert(schema.revenueStreams).values({
      tenantId: admin.tenantId,
      clientId: data.clientId,
      projectId: data.projectId || null,
      name: data.name,
      description: data.description,
      amount: data.amount,
      currency: data.currency || 'USD',
      frequency: data.frequency || 'monthly',
      status: data.status || 'active',
      autoGenerateInvoice: data.autoGenerateInvoice || false,
      nextBillingDate: data.nextBillingDate ? new Date(data.nextBillingDate).toISOString() : null,
    }).returning({ id: schema.revenueStreams.id });

    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: `Created new revenue stream: ${data.name}`,
    });

    return c.json({ success: true, streamId: newStream.id }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Update a revenue stream
revenueRoutes.put('/streams/:id', requireAdmin, async (c) => {
  const admin = c.get('user');
  const streamId = parseInt(c.req.param('id'));
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

    await db.update(schema.revenueStreams).set({
      clientId: data.clientId,
      projectId: data.projectId || null,
      name: data.name,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      frequency: data.frequency,
      status: data.status,
      autoGenerateInvoice: data.autoGenerateInvoice,
      nextBillingDate: data.nextBillingDate ? new Date(data.nextBillingDate).toISOString() : null,
    }).where(and(eq(schema.revenueStreams.id, streamId), eq(schema.revenueStreams.tenantId, admin.tenantId)));

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Delete a revenue stream
revenueRoutes.delete('/streams/:id', requireAdmin, async (c) => {
  const admin = c.get('user');
  const streamId = parseInt(c.req.param('id'));
  const db = c.get('db');

  try {
    await db.delete(schema.revenueStreams)
      .where(and(eq(schema.revenueStreams.id, streamId), eq(schema.revenueStreams.tenantId, admin.tenantId)));
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get revenue records
revenueRoutes.get('/records', requireAdmin, async (c) => {
  const admin = c.get('user');
  const db = c.get('db');
  
  try {
    const records = await db.select({
      record: schema.revenueRecords,
      stream: schema.revenueStreams
    })
    .from(schema.revenueRecords)
    .leftJoin(schema.revenueStreams, eq(schema.revenueRecords.streamId, schema.revenueStreams.id))
    .where(eq(schema.revenueRecords.tenantId, admin.tenantId))
    .orderBy(desc(schema.revenueRecords.recordedAt));
    
    return c.json(records);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default revenueRoutes;
