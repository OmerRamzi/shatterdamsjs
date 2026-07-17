import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import { getDb } from '../db/client';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';

type Bindings = {
  DATABASE_URL: string;
  RESEND_API_KEY: string;
};

const clientsRoutes = new Hono<{ Bindings: Bindings, Variables: { user: any } }>();

clientsRoutes.use('*', requireAuth, requireAdmin);

const mapClientToCamelCase = (c: any) => ({
  id: c.id,
  tenantId: c.tenantId,
  companyName: c.companyName,
  contactPerson: c.contactPerson,
  email: c.email,
  phone: c.phone,
  address: c.address,
  city: c.city,
  country: c.country,
  status: c.status,
  userId: c.userId,
  createdAt: c.createdAt,
});

clientsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DATABASE_URL);

  try {
    const data = await db.select().from(schema.clients).where(eq(schema.clients.tenantId, user.tenantId));
    return c.json(data.map(mapClientToCamelCase));
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

clientsRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const clientId = parseInt(c.req.param('id'));
  const db = getDb(c.env.DATABASE_URL);

  try {
    const [clientData] = await db.select().from(schema.clients)
      .where(and(eq(schema.clients.tenantId, user.tenantId), eq(schema.clients.id, clientId)))
      .limit(1);
      
    if (!clientData) return c.json({ error: 'Client not found' }, 404);
    return c.json(mapClientToCamelCase(clientData));
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

clientsRoutes.post('/', async (c) => {
  const admin = c.get('user');
  const data = await c.req.json();
  const db = getDb(c.env.DATABASE_URL);

  try {
    await db.insert(schema.clients).values({
      tenantId: admin.tenantId,
      companyName: data.companyName,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country || 'Sri Lanka',
      status: 'active',
    });

    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: `Client '${data.companyName}' added (Unactivated).`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

clientsRoutes.post('/:id/activate', async (c) => {
  const admin = c.get('user');
  const clientId = parseInt(c.req.param('id'));
  const db = getDb(c.env.DATABASE_URL);
  const resend = new Resend(c.env.RESEND_API_KEY || 're_dummy');

  try {
    const [client] = await db.select().from(schema.clients).where(eq(schema.clients.id, clientId)).limit(1);

    if (!client) return c.json({ error: 'Client not found' }, 404);
    if (client.userId) return c.json({ error: 'Client is already activated' }, 400);

    const randomPassword = Math.random().toString(36).slice(-8) + 'Aa1@';
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    const [newUser] = await db.insert(schema.users).values({
      tenantId: admin.tenantId,
      email: client.email,
      passwordHash: passwordHash,
      displayName: client.contactPerson || client.companyName,
      preferredLocale: 'en',
    }).returning({ id: schema.users.id });

    const userId = newUser.id;

    await db.insert(schema.userRoles).values({ userId, role: 'client' });
    await db.update(schema.clients).set({ userId }).where(eq(schema.clients.id, clientId));

    await resend.emails.send({
      from: 'Shatter DAMS <hello@mailer.meetshatter.com>',
      to: [client.email],
      subject: 'Your Shatter DAMS Client Portal Access',
      html: `
        <h2>Welcome to your Client Portal</h2>
        <p>Your account has been activated. You can now log in to view your projects and files.</p>
        <p><strong>Login URL:</strong> https://client.meetshatter.com/login</p>
        <p><strong>Email:</strong> ${client.email}</p>
        <p><strong>Password:</strong> ${randomPassword}</p>
        <br/>
        <p>Please change your password upon logging in.</p>
      `,
    });

    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: `Client '${client.companyName}' account activated and credentials emailed.`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

clientsRoutes.put('/:id', async (c) => {
  const admin = c.get('user');
  const clientId = parseInt(c.req.param('id'));
  const data = await c.req.json();
  const db = getDb(c.env.DATABASE_URL);
  
  try {
    await db.update(schema.clients).set({
      companyName: data.companyName,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country,
    }).where(and(eq(schema.clients.id, clientId), eq(schema.clients.tenantId, admin.tenantId)));

    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: `Client '${data.companyName}' details updated.`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

clientsRoutes.delete('/:id', async (c) => {
  const admin = c.get('user');
  const clientId = parseInt(c.req.param('id'));
  const db = getDb(c.env.DATABASE_URL);
  
  try {
    await db.delete(schema.clients).where(and(eq(schema.clients.id, clientId), eq(schema.clients.tenantId, admin.tenantId)));
    
    await db.insert(schema.activityLogs).values({
      tenantId: admin.tenantId,
      userId: parseInt(admin.sub as string),
      action: `Client ID ${clientId} deleted.`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default clientsRoutes;
