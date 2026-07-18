import { Hono } from 'hono';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';

const webhookRoutes = new Hono();

// POST /api/webhooks/commissions/:tenantId
webhookRoutes.post('/commissions/:tenantId', async (c) => {
  const tenantId = parseInt(c.req.param('tenantId'));
  const db = c.get('db');
  
  if (isNaN(tenantId)) return c.json({ error: 'Invalid tenantId' }, 400);

  // Authenticate Webhook Secret
  const authHeader = c.req.header('Authorization'); // "Bearer <secret>"
  const webhookSecret = c.req.header('x-webhook-secret') || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

  if (!webhookSecret) {
    return c.json({ error: 'Missing Webhook Secret' }, 401);
  }

  try {
    const [setting] = await db.select().from(schema.settings)
      .where(and(eq(schema.settings.tenantId, tenantId), eq(schema.settings.settingKey, 'webhook_secret')))
      .limit(1);

    if (!setting || setting.settingValue !== webhookSecret) {
      return c.json({ error: 'Unauthorized Webhook' }, 401);
    }

    // Parse the payload. 
    // Standardizing the payload to: { source: string, amount: string, currency: string, referenceId?: string, notes?: string }
    const data = await c.req.json();

    if (!data.source || !data.amount) {
      return c.json({ error: 'Missing required fields: source, amount' }, 400);
    }

    // Check if this referenceId already exists to avoid duplicate logs (idempotency)
    if (data.referenceId) {
      const [existing] = await db.select().from(schema.commissions)
        .where(and(eq(schema.commissions.tenantId, tenantId), eq(schema.commissions.referenceId, data.referenceId)))
        .limit(1);

      if (existing) {
        return c.json({ success: true, message: 'Commission already recorded', id: existing.id }, 200);
      }
    }

    const [newCommission] = await db.insert(schema.commissions).values({
      tenantId: tenantId,
      source: data.source,
      amount: data.amount,
      currency: data.currency || 'USD',
      date: new Date().toISOString().split('T')[0],
      status: 'paid', // Typically webhooks notify of actual payouts
      referenceId: data.referenceId || null,
      notes: data.notes || 'Logged via Webhook API',
    }).returning({ id: schema.commissions.id });

    return c.json({ success: true, id: newCommission.id }, 201);
  } catch (error: any) {
    console.error('Webhook error:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default webhookRoutes;
