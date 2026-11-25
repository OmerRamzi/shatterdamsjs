import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const DELEGABLE_MODULE_KEYS = [
  'overview',
  'crm',
  'clients',
  'invoices',
  'quotes',
  'projects',
  'tasks',
  'timesheets',
  'financials',
  'commissions',
  'reports',
] as const;

export type ModuleKey = (typeof DELEGABLE_MODULE_KEYS)[number];
export type AccessLevel = 'view' | 'manage' | 'full';
export type DataScope = 'all' | 'assigned';
export type UserRole = 'administrator' | 'employee' | 'freelancer' | 'client';

export interface PermissionGrant {
  level: AccessLevel;
  scope: DataScope;
}

export type UserPermissionsMap = Partial<Record<ModuleKey, PermissionGrant>>;

export interface AuthUser {
  id: number;
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: number;
  permissions: UserPermissionsMap;
}

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  group: 'Operations' | 'CRM & Sales' | 'Financials & Billing';
  supportsScope: boolean;
  defaultScope: DataScope;
  sensitive?: boolean;
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    key: 'overview',
    label: 'Dashboard Analytics & Activity',
    description: 'View organization KPI metrics, revenue summary charts, and tenant activity logs.',
    group: 'Operations',
    supportsScope: false,
    defaultScope: 'all',
  },
  {
    key: 'projects',
    label: 'All Projects',
    description: 'Access all tenant projects (or assigned projects), milestones, files, and AI breakdown.',
    group: 'Operations',
    supportsScope: true,
    defaultScope: 'all',
  },
  {
    key: 'tasks',
    label: 'Tasks Board',
    description: 'View and manage the organization-wide tasks view across permitted projects.',
    group: 'Operations',
    supportsScope: false,
    defaultScope: 'all',
  },
  {
    key: 'timesheets',
    label: 'Team Timesheets & Approvals',
    description: 'Review all staff timesheets and approve or reject submitted work hours.',
    group: 'Operations',
    supportsScope: false,
    defaultScope: 'all',
  },
  {
    key: 'crm',
    label: 'CRM (Deals, Leads & Contacts)',
    description: 'Manage sales pipeline, leads, contacts, interactions, CSV imports, and lead conversion.',
    group: 'CRM & Sales',
    supportsScope: true,
    defaultScope: 'all',
  },
  {
    key: 'clients',
    label: 'Clients',
    description: 'View and manage client profiles. Full access enables client portal activation & deletion.',
    group: 'CRM & Sales',
    supportsScope: false,
    defaultScope: 'all',
    sensitive: true,
  },
  {
    key: 'invoices',
    label: 'Invoices',
    description: 'View, create, edit, send invoices, and record payments & payment proofs.',
    group: 'Financials & Billing',
    supportsScope: false,
    defaultScope: 'all',
    sensitive: true,
  },
  {
    key: 'quotes',
    label: 'Quotations',
    description: 'View, create, edit, send quotations, and convert accepted quotes into invoices.',
    group: 'Financials & Billing',
    supportsScope: false,
    defaultScope: 'all',
  },
  {
    key: 'financials',
    label: 'Financials & Revenue Streams',
    description: 'Manage recurring revenue streams, billing schedules, and revenue records.',
    group: 'Financials & Billing',
    supportsScope: false,
    defaultScope: 'all',
    sensitive: true,
  },
  {
    key: 'commissions',
    label: 'Commissions',
    description: 'Track partner commissions. Full access allows viewing/regenerating webhook secrets.',
    group: 'Financials & Billing',
    supportsScope: false,
    defaultScope: 'all',
    sensitive: true,
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'Access financial YTD summaries and organization analytics reports.',
    group: 'Financials & Billing',
    supportsScope: false,
    defaultScope: 'all',
  },
];

const ACCESS_RANK: Record<AccessLevel, number> = {
  view: 1,
  manage: 2,
  full: 3,
};

export function isValidModuleKey(key: string): key is ModuleKey {
  return (DELEGABLE_MODULE_KEYS as readonly string[]).includes(key);
}

export function isValidAccessLevel(level: string): level is AccessLevel {
  return level === 'view' || level === 'manage' || level === 'full';
}

export function isValidDataScope(scope: string): scope is DataScope {
  return scope === 'all' || scope === 'assigned';
}

export function isInternalStaff(user: Pick<AuthUser, 'role'> | undefined | null): boolean {
  if (!user) return false;
  return user.role === 'administrator' || user.role === 'employee' || user.role === 'freelancer';
}

export function hasPermission(
  user: AuthUser | undefined | null,
  moduleKey: ModuleKey,
  minLevel: AccessLevel = 'view'
): boolean {
  if (!user) return false;
  if (user.role === 'administrator') return true;
  if (user.role === 'client') return false;

  const grant = user.permissions?.[moduleKey];
  if (!grant) return false;

  return ACCESS_RANK[grant.level] >= ACCESS_RANK[minLevel];
}

export function getPermissionScope(
  user: AuthUser | undefined | null,
  moduleKey: ModuleKey
): DataScope | null {
  if (!user) return null;
  if (user.role === 'administrator') return 'all';
  if (user.role === 'client') return null;

  return user.permissions?.[moduleKey]?.scope || null;
}

/**
 * Loads live user state, role, and module permissions from PostgreSQL so
 * permission grants/revocations and account deactivations take effect immediately.
 */
export async function hydrateAuthUser(db: any, userId: number): Promise<AuthUser | null> {
  const [dbUser] = await db
    .select({
      id: schema.users.id,
      tenantId: schema.users.tenantId,
      email: schema.users.email,
      displayName: schema.users.displayName,
      isActive: schema.users.isActive,
      deletedAt: schema.users.deletedAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!dbUser || dbUser.deletedAt || dbUser.isActive === false) {
    return null;
  }

  const [roleRec] = await db
    .select({ role: schema.userRoles.role })
    .from(schema.userRoles)
    .where(eq(schema.userRoles.userId, dbUser.id))
    .limit(1);

  const role = (roleRec?.role || 'client') as UserRole;
  const permissions: UserPermissionsMap = {};

  if (role === 'employee' || role === 'freelancer') {
    const rows = await db
      .select({
        moduleKey: schema.userModulePermissions.moduleKey,
        accessLevel: schema.userModulePermissions.accessLevel,
        scope: schema.userModulePermissions.scope,
      })
      .from(schema.userModulePermissions)
      .where(
        and(
          eq(schema.userModulePermissions.userId, dbUser.id),
          eq(schema.userModulePermissions.tenantId, dbUser.tenantId)
        )
      );

    for (const row of rows) {
      const key = String(row.moduleKey);
      if (isValidModuleKey(key)) {
        permissions[key] = {
          level: row.accessLevel as AccessLevel,
          scope: row.scope as DataScope,
        };
      }
    }
  }

  return {
    id: dbUser.id,
    sub: String(dbUser.id),
    email: dbUser.email,
    name: dbUser.displayName,
    role,
    tenantId: dbUser.tenantId,
    permissions,
  };
}
