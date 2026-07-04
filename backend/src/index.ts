import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono<{ Bindings: { DATABASE_URL: string } }>();

app.use('*', cors({
  origin: ['http://localhost:5173'], // Vite default port
  credentials: true,
}));

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/debug-env', (c) => {
  return c.json({ keys: Object.keys(c.env || {}) });
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

export default app;
