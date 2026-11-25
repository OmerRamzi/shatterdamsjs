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

export interface PermissionRowInput {
  moduleKey: ModuleKey;
  accessLevel: AccessLevel;
  scope: DataScope;
}

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  shortLabel: string;
  description: string;
  group: 'Operations' | 'CRM & Sales' | 'Financials & Billing';
  supportsScope: boolean;
  defaultScope: DataScope;
  sensitive?: boolean;
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    key: 'crm',
    label: 'CRM (Deals, Leads & Contacts)',
    shortLabel: 'CRM',
    description: 'Sales pipeline, leads, contacts, interactions, CSV import, and lead conversion.',
    group: 'CRM & Sales',
    supportsScope: true,
    defaultScope: 'all',
  },
  {
    key: 'clients',
    label: 'Clients Directory',
    shortLabel: 'Clients',
    description: 'View and manage client profiles. Full access enables portal activation & delete.',
    group: 'CRM & Sales',
    supportsScope: false,
    defaultScope: 'all',
    sensitive: true,
  },
  {
    key: 'invoices',
    label: 'Invoices',
    shortLabel: 'Invoices',
    description: 'View, create, edit, send invoices, and record payments & payment proofs.',
    group: 'Financials & Billing',
    supportsScope: false,
    defaultScope: 'all',
    sensitive: true,
  },
  {
    key: 'quotes',
    label: 'Quotations',
    shortLabel: 'Quotations',
    description: 'View, create, edit, send quotations, and convert accepted quotes into invoices.',
    group: 'Financials & Billing',
    supportsScope: false,
    defaultScope: 'all',
  },
  {
    key: 'financials',
    label: 'Financials & Revenue Streams',
    shortLabel: 'Financials',
    description: 'Manage recurring revenue streams, billing schedules, and revenue records.',
    group: 'Financials & Billing',
    supportsScope: false,
    defaultScope: 'all',
    sensitive: true,
  },
  {
    key: 'commissions',
    label: 'Commissions',
    shortLabel: 'Commissions',
    description: 'Track partner commissions. Full access allows webhook secret management.',
    group: 'Financials & Billing',
    supportsScope: false,
    defaultScope: 'all',
    sensitive: true,
  },
  {
    key: 'reports',
    label: 'Reports',
    shortLabel: 'Reports',
    description: 'Access financial YTD summaries and organization analytics reports.',
    group: 'Financials & Billing',
    supportsScope: false,
    defaultScope: 'all',
  },
  {
    key: 'projects',
    label: 'All Projects',
    shortLabel: 'All Projects',
    description: 'Access tenant projects (or assigned only), milestones, files, and AI breakdown.',
    group: 'Operations',
    supportsScope: true,
    defaultScope: 'all',
  },
  {
    key: 'tasks',
    label: 'Tasks Board',
    shortLabel: 'Tasks',
    description: 'View and manage the organization-wide tasks view across permitted projects.',
    group: 'Operations',
    supportsScope: false,
    defaultScope: 'all',
  },
  {
    key: 'timesheets',
    label: 'Team Timesheets & Approvals',
    shortLabel: 'Team Timesheets',
    description: 'Review all team timesheets and approve or reject submitted work hours.',
    group: 'Operations',
    supportsScope: false,
    defaultScope: 'all',
  },
  {
    key: 'overview',
    label: 'Analytics & Activity Feed',
    shortLabel: 'Analytics',
    description: 'View organization KPI overview metrics and tenant activity logs.',
    group: 'Operations',
    supportsScope: false,
    defaultScope: 'all',
  },
];

export interface PermissionPreset {
  id: string;
  label: string;
  description: string;
  permissions: PermissionRowInput[];
}

export const PERMISSION_PRESETS: PermissionPreset[] = [
  {
    id: 'none',
    label: 'Standard Staff',
    description: 'Baseline team portal only (My Projects & My Timesheets)',
    permissions: [],
  },
  {
    id: 'crm_sales',
    label: 'CRM / Sales',
    description: 'CRM pipeline, leads, contacts & client viewing',
    permissions: [
      { moduleKey: 'crm', accessLevel: 'manage', scope: 'all' },
      { moduleKey: 'clients', accessLevel: 'view', scope: 'all' },
      { moduleKey: 'quotes', accessLevel: 'manage', scope: 'all' },
    ],
  },
  {
    id: 'billing_finance',
    label: 'Billing & Invoices',
    description: 'Invoices, quotations, reports & client viewing',
    permissions: [
      { moduleKey: 'invoices', accessLevel: 'manage', scope: 'all' },
      { moduleKey: 'quotes', accessLevel: 'manage', scope: 'all' },
      { moduleKey: 'clients', accessLevel: 'view', scope: 'all' },
      { moduleKey: 'reports', accessLevel: 'view', scope: 'all' },
    ],
  },
  {
    id: 'ops_lead',
    label: 'Operations Lead',
    description: 'All projects, tasks & team timesheet approvals',
    permissions: [
      { moduleKey: 'projects', accessLevel: 'manage', scope: 'all' },
      { moduleKey: 'tasks', accessLevel: 'manage', scope: 'all' },
      { moduleKey: 'timesheets', accessLevel: 'manage', scope: 'all' },
      { moduleKey: 'clients', accessLevel: 'view', scope: 'all' },
    ],
  },
];

const ACCESS_RANK: Record<AccessLevel, number> = {
  view: 1,
  manage: 2,
  full: 3,
};

export function hasModulePermission(
  user: { role?: UserRole; permissions?: UserPermissionsMap } | null | undefined,
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

export function getModuleScope(
  user: { role?: UserRole; permissions?: UserPermissionsMap } | null | undefined,
  moduleKey: ModuleKey
): DataScope | null {
  if (!user) return null;
  if (user.role === 'administrator') return 'all';
  if (user.role === 'client') return null;
  return user.permissions?.[moduleKey]?.scope || null;
}

export function getModuleLabel(key: string): string {
  return MODULE_DEFINITIONS.find((m) => m.key === key)?.shortLabel || key;
}
