import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import * as schema from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

const revenueRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any } }>();

revenueRoutes.use('*', requireAuth);

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
    if (typeof data.clientId !== 'number' || isNaN(data.clientId)) {
      return c.json({ error: 'Client ID is required' }, 400);
    }
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
      amount: data.amount !== undefined && data.amount !== null ? String(data.amount) : '0.00',
      currency: data.currency || 'USD',
      frequency: data.frequency || 'monthly',
      status: data.status || 'active',
      autoGenerateInvoice: data.autoGenerateInvoice || false,
      nextBillingDate: data.nextBillingDate 
        ? (typeof data.nextBillingDate === 'string' && data.nextBillingDate.includes('T') 
            ? data.nextBillingDate.split('T')[0] 
            : data.nextBillingDate) 
        : null,
    }).returning({ id: schema.revenueStreams.id });

    const actionText = `Created new revenue stream: ${data.name}`;
    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: actionText.length > 100 ? actionText.substring(0, 97) + '...' : actionText,
    });

    return c.json({ success: true, streamId: newStream.id }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get a specific revenue stream with its details
revenueRoutes.get('/streams/:id', requireAdmin, async (c) => {
  const admin = c.get('user');
  const streamId = parseInt(c.req.param('id'));
  if (isNaN(streamId)) return c.json({ error: 'Invalid stream ID' }, 400);
  const db = c.get('db');

  try {
    const [streamData] = await db.select({
      stream: schema.revenueStreams,
      client: schema.clients,
      project: schema.projects
    })
    .from(schema.revenueStreams)
    .leftJoin(schema.clients, eq(schema.revenueStreams.clientId, schema.clients.id))
    .leftJoin(schema.projects, eq(schema.revenueStreams.projectId, schema.projects.id))
    .where(and(eq(schema.revenueStreams.id, streamId), eq(schema.revenueStreams.tenantId, admin.tenantId)))
    .limit(1);

    if (!streamData) {
      return c.json({ error: 'Stream not found' }, 404);
    }

    const records = await db.select()
      .from(schema.revenueRecords)
      .where(and(eq(schema.revenueRecords.streamId, streamId), eq(schema.revenueRecords.tenantId, admin.tenantId)))
      .orderBy(desc(schema.revenueRecords.recordedAt));

    let invoiceCondition = eq(schema.invoices.clientId, streamData.stream.clientId);
    if (streamData.stream.projectId) {
      invoiceCondition = and(invoiceCondition, eq(schema.invoices.projectId, streamData.stream.projectId)) as any;
    }

    const recentInvoices = await db.select()
      .from(schema.invoices)
      .where(and(invoiceCondition, eq(schema.invoices.tenantId, admin.tenantId)))
      .orderBy(desc(schema.invoices.issueDate))
      .limit(10);

    return c.json({ ...streamData, records, invoices: recentInvoices });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Update a revenue stream
revenueRoutes.put('/streams/:id', requireAdmin, async (c) => {
  const admin = c.get('user');
  const streamId = parseInt(c.req.param('id'));
  if (isNaN(streamId)) return c.json({ error: 'Invalid stream ID' }, 400);
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
      amount: data.amount !== undefined && data.amount !== null ? String(data.amount) : undefined,
      currency: data.currency,
      frequency: data.frequency,
      status: data.status,
      autoGenerateInvoice: data.autoGenerateInvoice,
      nextBillingDate: data.nextBillingDate === undefined 
        ? undefined 
        : (data.nextBillingDate && typeof data.nextBillingDate === 'string' && data.nextBillingDate.includes('T') 
            ? data.nextBillingDate.split('T')[0] 
            : data.nextBillingDate),
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
  if (isNaN(streamId)) return c.json({ error: 'Invalid stream ID' }, 400);
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
