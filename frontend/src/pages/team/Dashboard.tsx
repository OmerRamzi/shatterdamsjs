import { useState, useEffect } from 'react';
import {
  FolderGit2,
  ArrowRight,
  Clock,
  CheckSquare,
  Target,
  Receipt,
  FileText,
  Building2,
  DollarSign,
  Link2,
  BarChart3,
  ClipboardCheck,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function TeamDashboardPage() {
  const { user, hasPermission } = useAuth();
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/team/projects')
      .then((res) => res.json())
      .then((data) => setProjectsData(Array.isArray(data) ? data : []))
      .catch(() => setProjectsData([]))
      .finally(() => setIsLoading(false));
  }, []);

  const activeProjects = projectsData.filter((p) => p.project?.status !== 'completed');

  const quickModuleLinks = [
    hasPermission('crm', 'view') && {
      title: 'CRM & Sales Pipeline',
      desc: 'Manage leads, deals, and client contacts.',
      to: '/crm',
      icon: Target,
      level: user?.permissions?.crm?.level || 'full',
    },
    hasPermission('invoices', 'view') && {
      title: 'Invoices & Billing',
      desc: 'View, issue, and track client invoice payments.',
      to: '/invoices',
      icon: Receipt,
      level: user?.permissions?.invoices?.level || 'full',
    },
    hasPermission('quotes', 'view') && {
      title: 'Quotations',
      desc: 'Prepare estimates and convert accepted quotes.',
      to: '/quotes',
      icon: FileText,
      level: user?.permissions?.quotes?.level || 'full',
    },
    hasPermission('clients', 'view') && {
      title: 'Clients Directory',
      desc: 'Browse client organizations and profiles.',
      to: '/clients',
      icon: Building2,
      level: user?.permissions?.clients?.level || 'full',
    },
    hasPermission('tasks', 'view') && {
      title: 'Tasks Board',
      desc: 'Track deliverables across active projects.',
      to: '/tasks',
      icon: CheckSquare,
      level: user?.permissions?.tasks?.level || 'full',
    },
    hasPermission('timesheets', 'view') && {
      title: 'Team Timesheets',
      desc: 'Review and approve team time logs.',
      to: '/team-timesheets',
      icon: ClipboardCheck,
      level: user?.permissions?.timesheets?.level || 'full',
    },
    hasPermission('financials', 'view') && {
      title: 'Financials & Revenue',
      desc: 'Monitor recurring revenue streams.',
      to: '/financials',
      icon: DollarSign,
      level: user?.permissions?.financials?.level || 'full',
    },
    hasPermission('commissions', 'view') && {
      title: 'Commissions',
      desc: 'Manage partner referral payouts.',
      to: '/commissions',
      icon: Link2,
      level: user?.permissions?.commissions?.level || 'full',
    },
    hasPermission('reports', 'view') && {
      title: 'Reports',
      desc: 'View YTD revenue and analytics summaries.',
      to: '/reports',
      icon: BarChart3,
      level: user?.permissions?.reports?.level || 'full',
    },
  ].filter(Boolean) as Array<{
    title: string;
    desc: string;
    to: string;
    icon: React.ElementType;
    level: string;
  }>;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-1">
            Production Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 font-heading">
            Team Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Your active deliverables, scope tasks, and timesheets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/timesheets"
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs sm:text-sm shadow-xs transition-colors"
          >
            <Clock className="w-4 h-4" />
            <span>Log timesheet</span>
          </Link>
        </div>
      </div>

      {/* Granted Workspace Modules */}
      {quickModuleLinks.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2 font-heading">
              <ShieldCheck className="w-4 h-4 text-yellow-600" />
              <span>Granted Modules</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {quickModuleLinks.length} enabled
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickModuleLinks.map((mod) => (
              <Link
                key={mod.to}
                to={mod.to}
                className="group p-3.5 rounded-xl border border-slate-200/80 hover:border-yellow-400/70 hover:bg-amber-50/30 transition-all flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-yellow-400/20 text-slate-700 group-hover:text-amber-700 flex items-center justify-center shrink-0 transition-colors">
                    <mod.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                      {mod.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                      {mod.desc}
                    </p>
                    <span className="inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {mod.level}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 shrink-0 mt-1 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {/* Active Assignments Card */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2 font-heading">
                <FolderGit2 className="w-4 h-4 text-yellow-600" />
                <span>Active Assignments</span>
              </h3>
              <span className="text-xs font-medium text-slate-500">
                {isLoading ? '...' : `${activeProjects.length} projects`}
              </span>
            </div>

            <div className="space-y-2">
              {isLoading ? (
                <p className="text-xs text-slate-400 py-6 text-center">Loading assignments...</p>
              ) : activeProjects.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500">
                  You currently have no active project assignments.
                </div>
              ) : (
                activeProjects.slice(0, 5).map((p) => (
                  <div
                    key={p.project?.id || Math.random()}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-medium text-xs sm:text-sm text-slate-900 truncate">
                        {p.project?.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {p.client?.companyName || 'Internal deliverable'}
                      </p>
                    </div>
                    <Link
                      to={`/projects/${p.project?.id}`}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
                      title="Open project"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {activeProjects.length > 5 && (
            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <Link to="/projects" className="text-xs font-semibold text-yellow-600 hover:text-yellow-700">
                View all active projects
              </Link>
            </div>
          )}
        </div>

        {/* Quick Tools & Guidelines */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2 font-heading">
                <CheckSquare className="w-4 h-4 text-yellow-600" />
                <span>Quick Production Links</span>
              </h3>
            </div>

            <div className="space-y-2.5">
              <Link
                to="/timesheets"
                className="block p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <p className="font-semibold text-xs sm:text-sm text-slate-900">Weekly Timesheets</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Submit daily work logs, billable hours, and notes.
                </p>
              </Link>

              <Link
                to="/projects"
                className="block p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <p className="font-semibold text-xs sm:text-sm text-slate-900">
                  Deliverables & Asset Reviews
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Review client feedback, comments, and approved assets.
                </p>
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
            <span>Shatter DAMS — Creative Production & Asset Ops</span>
          </div>
        </div>
      </div>
    </div>
  );
}
