import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config';

import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './db/schema';

type Variables = {
  user: any;
  db: ReturnType<typeof drizzle>;
};

const app = new Hono<{ Bindings: { DATABASE_URL: string, HYPERDRIVE: any }, Variables: Variables }>();

app.use('*', cors({
  origin: ['http://localhost:5173', 'https://admin.meetshatter.com', 'https://team.meetshatter.com', 'https://client.meetshatter.com'], 
  credentials: true,
}));

// Inject config fallbacks into c.env because Cloudflare drops them on some CI builds
app.use('*', async (c, next) => {
  for (const [key, value] of Object.entries(config)) {
    if (!(c.env as any)[key] && value) {
      (c.env as any)[key] = value;
    }
  }
  await next();
});

// Database middleware
app.use('*', async (c, next) => {
  const connString = c.env?.HYPERDRIVE?.connectionString || c.env.DATABASE_URL;
  if (connString) {
    const client = new Client({ connectionString: connString });
    await client.connect();
    const db = drizzle(client, { schema });
    c.set('db', db);
    try {
      await next();
    } finally {
      c.executionCtx.waitUntil(client.end());
    }
  } else {
    await next();
  }
});

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/debug-env', (c) => {
  return c.json({ 
    envString: JSON.stringify(c.env),
    envType: typeof c.env,
    envKeys: Object.keys(c.env || {})
  });
});



app.onError((err, c) => {
  console.error('Unhandled Error:', err);
  return c.json({ error: err.message, stack: err.stack }, 500);
});

// We will mount routes here
import authRoutes from './routes/auth';
import clientsRoutes from './routes/clients';
import filesRoutes from './routes/files';
import activityRoutes from './routes/activity';
import projectsRoutes from './routes/projects';
import teamRoutes from './routes/team';
import portalRoutes from './routes/portal';
import invoicesRoutes from './routes/invoices';
import quotesRoutes from './routes/quotes';
import usersRoutes from './routes/users';
import tasksRoutes from './routes/tasks';
import timesheetsRoutes from './routes/timesheets';
import reportsRoutes from './routes/reports';
import settingsRoutes from './routes/settings';
import revenueRoutes from './routes/revenue';
import commissionsRoutes from './routes/commissions';
import webhookRoutes from './routes/webhooks';

app.route('/api/auth', authRoutes);
app.route('/api/clients', clientsRoutes);
app.route('/api/files', filesRoutes);
app.route('/api/activity', activityRoutes);
app.route('/api/projects', projectsRoutes);
app.route('/api/team', teamRoutes);
app.route('/api/portal', portalRoutes);
app.route('/api/invoices', invoicesRoutes);
app.route('/api/quotes', quotesRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/tasks', tasksRoutes);
app.route('/api/timesheets', timesheetsRoutes);
app.route('/api/reports', reportsRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/revenue', revenueRoutes);
app.route('/api/commissions', commissionsRoutes);
app.route('/api/webhooks', webhookRoutes);

import { processRevenueStreams } from './cron/revenue';

export default {
  fetch(request: Request, env: any, ctx: any) {
    return app.fetch(request, env, ctx);
  },
  async scheduled(event: any, env: any, ctx: any) {
    ctx.waitUntil(processRevenueStreams(env));
  }
};
