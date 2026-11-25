import { Hono } from 'hono';
import {
  requireAuth,
  requireInternalStaff,
  requireAnyPermission,
} from '../middleware';
import * as schema from '../db/schema';
import { eq, and, isNull, inArray, asc, desc } from 'drizzle-orm';
import { AuthUser, getPermissionScope, hasPermission } from '../lib/permissions';

const lookupsRoutes = new Hono<{
  Bindings: { DATABASE_URL: string };
  Variables: { user: AuthUser; db: any };
}>();

lookupsRoutes.use('*', requireAuth, requireInternalStaff);

/**
 * GET /api/lookups/clients
 * Lightweight client selector for forms (CRM deals/contacts, Invoices, Quotes, Financials, Commissions).
 */
lookupsRoutes.get(
  '/clients',
  requireAnyPermission([
    { module: 'clients', minLevel: 'view' },
    { module: 'crm', minLevel: 'view' },
    { module: 'invoices', minLevel: 'view' },
    { module: 'quotes', minLevel: 'view' },
    { module: 'projects', minLevel: 'view' },
    { module: 'financials', minLevel: 'view' },
    { module: 'commissions', minLevel: 'view' },
  ]),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');

    try {
      const rows = await db
        .select({
          id: schema.clients.id,
          companyName: schema.clients.companyName,
          contactPerson: schema.clients.contactPerson,
        })
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.tenantId, user.tenantId),
            isNull(schema.clients.deletedAt)
          )
        )
        .orderBy(asc(schema.clients.companyName));

      return c.json(rows);
    } catch (error: any) {
      console.error('Lookup clients error:', error);
      return c.json({ error: 'Failed to load clients lookup' }, 500);
    }
  }
);

/**
 * GET /api/lookups/projects
 * Lightweight project selector for forms & timesheets.
 * Restricted to assigned projectTeam rows unless user has 'projects' ('all' scope),
 * 'invoices', 'quotes', 'financials', or 'tasks' module access.
 */
lookupsRoutes.get('/projects', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const statusFilter = c.req.query('status');

  try {
    const canSeeAllProjects =
      user.role === 'administrator' ||
      (hasPermission(user, 'projects', 'view') &&
        getPermissionScope(user, 'projects') === 'all') ||
      hasPermission(user, 'invoices', 'view') ||
      hasPermission(user, 'quotes', 'view') ||
      hasPermission(user, 'financials', 'view') ||
      hasPermission(user, 'tasks', 'view');

    const conditions: any[] = [
      eq(schema.projects.tenantId, user.tenantId),
      isNull(schema.projects.deletedAt),
    ];

    if (statusFilter) {
      conditions.push(eq(schema.projects.status, statusFilter as any));
    }

    if (!canSeeAllProjects) {
      const assigned = await db
        .select({ projectId: schema.projectTeam.projectId })
        .from(schema.projectTeam)
        .where(eq(schema.projectTeam.userId, user.id));

      const projectIds = assigned.map((a: any) => a.projectId);
      if (projectIds.length === 0) {
        return c.json([]);
      }
      conditions.push(inArray(schema.projects.id, projectIds));
    }

    const rows = await db
      .select({
        id: schema.projects.id,
        title: schema.projects.title,
        clientId: schema.projects.clientId,
        status: schema.projects.status,
      })
      .from(schema.projects)
      .where(and(...conditions))
      .orderBy(desc(schema.projects.createdAt));

    return c.json(rows);
  } catch (error: any) {
    console.error('Lookup projects error:', error);
    return c.json({ error: 'Failed to load projects lookup' }, 500);
  }
});

/**
 * GET /api/lookups/team
 * Lightweight, tenant-scoped staff selector for assignee dropdowns (no sensitive user fields).
 */
lookupsRoutes.get(
  '/team',
  requireAnyPermission([
    { module: 'crm', minLevel: 'view' },
    { module: 'projects', minLevel: 'view' },
    { module: 'tasks', minLevel: 'view' },
    { module: 'timesheets', minLevel: 'view' },
  ]),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');

    try {
      const rows = await db
        .select({
          id: schema.users.id,
          displayName: schema.users.displayName,
          role: schema.userRoles.role,
        })
        .from(schema.users)
        .innerJoin(schema.userRoles, eq(schema.users.id, schema.userRoles.userId))
        .where(
          and(
            eq(schema.users.tenantId, user.tenantId),
            isNull(schema.users.deletedAt),
            eq(schema.users.isActive, true),
            inArray(schema.userRoles.role, [
              'administrator',
              'employee',
              'freelancer',
            ])
          )
        )
        .orderBy(asc(schema.users.displayName));

      return c.json(rows);
    } catch (error: any) {
      console.error('Lookup team error:', error);
      return c.json({ error: 'Failed to load team lookup' }, 500);
    }
  }
);

export default lookupsRoutes;
