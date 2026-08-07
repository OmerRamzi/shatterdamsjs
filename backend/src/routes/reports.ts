import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import * as schema from '../db/schema';
import { eq, sql, and, isNull } from 'drizzle-orm';
import { fromCents, toCents } from '../lib/calculations';

const reportsRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any } }>();

reportsRoutes.use('*', requireAuth);

reportsRoutes.get('/', requireAdmin, async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  
  try {
    const invoices = await db.select({
      status: schema.invoices.status,
      total: schema.invoices.total,
      paidAmount: schema.invoices.paidAmount,
    }).from(schema.invoices)
      .where(and(eq(schema.invoices.tenantId, user.tenantId), isNull(schema.invoices.deletedAt)));
      
    let revenueCents = 0;
    let pendingCents = 0;
    
    for (const inv of invoices) {
      if (inv.status === 'paid') {
        revenueCents += toCents(inv.total);
      } else if (inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'draft') {
        const total = toCents(inv.total);
        const paid = toCents(inv.paidAmount || '0.00');
        pendingCents += Math.max(0, total - paid);
        revenueCents += paid;
      }
    }

    return c.json({
      revenueYTD: fromCents(revenueCents),
      pendingInvoices: fromCents(pendingCents),
      reportGeneratedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default reportsRoutes;
