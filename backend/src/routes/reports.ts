import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import { getDb } from '../db/client';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

const reportsRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any } }>();

reportsRoutes.use('*', requireAuth);

reportsRoutes.get('/', requireAdmin, async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DATABASE_URL);
  
  try {
    const invoices = await db.select({ amount: schema.invoices.total, status: schema.invoices.status })
      .from(schema.invoices)
      .where(eq(schema.invoices.tenantId, user.tenantId));
      
    const revenue = invoices.filter(i => i.status === 'paid').reduce((a, b) => a + Number(b.amount || 0), 0);
    const pending = invoices.filter(i => i.status !== 'paid').reduce((a, b) => a + Number(b.amount || 0), 0);

    return c.json({
      revenueYTD: revenue,
      pendingInvoices: pending,
      reportGeneratedAt: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default reportsRoutes;
