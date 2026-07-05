import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import { createClient } from '@supabase/supabase-js';

const reportsRoutes = new Hono<{ Bindings: { SUPABASE_URL: string, SUPABASE_ANON_KEY: string }, Variables: { user: any } }>();

reportsRoutes.use('*', requireAuth);

reportsRoutes.get('/', async (c) => {
  const user = c.get('user');
  if (user.role !== 'administrator') return c.json({ error: 'Unauthorized' }, 403);
  
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  
  // Basic mock aggregate data for now since we don't have complex SQL functions
  const { data: invoices, error } = await supabase.from('invoices').select('amount, status').eq('tenant_id', user.tenantId);
  if (error) return c.json({ error: error.message }, 500);
  
  const revenue = (invoices || []).filter(i => i.status === 'paid').reduce((a, b) => a + Number(b.amount), 0);
  const pending = (invoices || []).filter(i => i.status !== 'paid').reduce((a, b) => a + Number(b.amount), 0);

  return c.json({
    revenueYTD: revenue,
    pendingInvoices: pending,
    reportGeneratedAt: new Date().toISOString()
  });
});

export default reportsRoutes;
