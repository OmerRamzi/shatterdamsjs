import { Outlet } from 'react-router-dom';
import { PortalLayout, type PortalNavGroup } from '../components/layout/PortalLayout';
import {
  LayoutDashboard,
  FolderKanban,
  Clock,
  Target,
  UserPlus,
  BookUser,
  Building2,
  DollarSign,
  Receipt,
  FileText,
  Link2,
  BarChart3,
  CheckSquare,
  ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function TeamLayout() {
  const { user, hasPermission } = useAuth();
  if (!user) return null;

  const navGroups: PortalNavGroup[] = [
    {
      groupTitle: 'Workspace',
      items: [
        { name: 'Dashboard', to: '/', icon: LayoutDashboard },
        {
          name: hasPermission('projects', 'view') ? 'Projects' : 'My Projects',
          to: '/projects',
          icon: FolderKanban,
        },
        { name: 'My Timesheets', to: '/timesheets', icon: Clock },
      ],
    },
  ];

  // Operations additions (beyond personal baseline)
  const opsItems = [];
  if (hasPermission('tasks', 'view')) {
    opsItems.push({ name: 'Tasks', to: '/tasks', icon: CheckSquare });
  }
  if (hasPermission('timesheets', 'view')) {
    opsItems.push({
      name: 'Team Timesheets',
      to: '/team-timesheets',
      icon: ClipboardCheck,
    });
  }
  if (opsItems.length > 0) {
    navGroups.push({ groupTitle: 'Operations', items: opsItems });
  }

  // CRM & Sales
  const crmItems = [];
  if (hasPermission('crm', 'view')) {
    crmItems.push(
      { name: 'Deals & Pipeline', to: '/crm', icon: Target },
      { name: 'Leads', to: '/crm/leads', icon: UserPlus },
      { name: 'Contacts', to: '/crm/contacts', icon: BookUser }
    );
  }
  if (hasPermission('clients', 'view')) {
    crmItems.push({ name: 'Clients', to: '/clients', icon: Building2 });
  }
  if (crmItems.length > 0) {
    navGroups.push({ groupTitle: 'CRM & Sales', items: crmItems });
  }

  // Financials & Billing
  const financeItems = [];
  if (hasPermission('financials', 'view')) {
    financeItems.push({ name: 'Financials', to: '/financials', icon: DollarSign });
  }
  if (hasPermission('invoices', 'view')) {
    financeItems.push({ name: 'Invoices', to: '/invoices', icon: Receipt });
  }
  if (hasPermission('quotes', 'view')) {
    financeItems.push({ name: 'Quotations', to: '/quotes', icon: FileText });
  }
  if (hasPermission('commissions', 'view')) {
    financeItems.push({ name: 'Commissions', to: '/commissions', icon: Link2 });
  }
  if (hasPermission('reports', 'view')) {
    financeItems.push({ name: 'Reports', to: '/reports', icon: BarChart3 });
  }
  if (financeItems.length > 0) {
    navGroups.push({ groupTitle: 'Financials & Billing', items: financeItems });
  }

  return (
    <PortalLayout navGroups={navGroups} basePath="/">
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </PortalLayout>
  );
}
