import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FolderKanban, 
  Users, 
  Briefcase, 
  Banknote, 
  Plus, 
  Receipt, 
  UserPlus, 
  BarChart3, 
  Target, 
  Inbox,
  Clock,
  ArrowUpRight,
  RefreshCw,
  CreditCard,
  FileText,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  FolderPlus
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ProjectModal } from "../../components/admin/ProjectModal";
import { TeamModal } from "../../components/admin/TeamModal";

interface ActivityUser {
  id?: number;
  displayName?: string;
  name?: string;
  email?: string;
  profileImage?: string | null;
}

interface ActivityItem {
  id: number;
  action: string;
  entityType?: string;
  entityId?: number;
  description?: string;
  createdAt: string;
  user?: ActivityUser | null;
}

interface DeadlineItem {
  id: number;
  title: string;
  subtitle?: string;
  dueDate: string;
  daysRemaining: number;
  status: string;
  link: string;
  type: 'project' | 'task';
}

interface DashboardStats {
  totalClients: number;
  activeProjects: number;
  allProjects: number;
  revenue: number;
  pendingRevenue?: number;
  overdueCount?: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeProjects: 0,
    allProjects: 0,
    revenue: 0,
    pendingRevenue: 0,
    overdueCount: 0,
  });
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLiveEnabled, setIsLiveEnabled] = useState(true);

  // Modal dialog states
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // Time of day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Today's formatted date
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    
    try {
      const [activityRes, statsRes, projectsRes, tasksRes] = await Promise.allSettled([
        fetch('/api/activity?limit=8').then(res => res.json()),
        fetch('/api/portal/stats').then(res => res.json()),
        fetch('/api/projects?status=active').then(res => res.json()),
        fetch('/api/tasks?status=in_progress').then(res => res.json())
      ]);

      // 1. Process Activities
      if (activityRes.status === 'fulfilled' && Array.isArray(activityRes.value)) {
        setActivities(activityRes.value);
      }

      // 2. Process Stats
      if (statsRes.status === 'fulfilled' && statsRes.value && !statsRes.value.error) {
        setStats(statsRes.value);
      }

      // 3. Process Real Upcoming Deadlines (combining active projects & urgent tasks)
      const collectedDeadlines: DeadlineItem[] = [];
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (projectsRes.status === 'fulfilled' && Array.isArray(projectsRes.value)) {
        for (const proj of projectsRes.value) {
          if (proj.deadline && proj.status !== 'completed' && proj.status !== 'cancelled') {
            const due = new Date(proj.deadline);
            due.setHours(0, 0, 0, 0);
            const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            // Only show if due within next 30 days or overdue
            if (diffDays <= 30) {
              collectedDeadlines.push({
                id: proj.id,
                title: proj.title,
                subtitle: proj.client?.companyName ? `Client: ${proj.client.companyName}` : 'Project Delivery',
                dueDate: proj.deadline,
                daysRemaining: diffDays,
                status: proj.status,
                link: `/projects/${proj.id}`,
                type: 'project'
              });
            }
          }
        }
      }

      if (tasksRes.status === 'fulfilled' && Array.isArray(tasksRes.value)) {
        for (const task of tasksRes.value) {
          if (task.dueDate && task.status !== 'completed' && task.status !== 'cancelled') {
            const due = new Date(task.dueDate);
            due.setHours(0, 0, 0, 0);
            const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 14) {
              collectedDeadlines.push({
                id: task.id,
                title: task.title,
                subtitle: task.assignee?.name ? `Assigned to ${task.assignee.name}` : 'Project Task',
                dueDate: task.dueDate,
                daysRemaining: diffDays,
                status: task.status,
                link: task.projectId ? `/projects/${task.projectId}` : '/tasks',
                type: 'task'
              });
            }
          }
        }
      }

      // Sort soonest first (including overdue negative days)
      collectedDeadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);
      setDeadlines(collectedDeadlines.slice(0, 4));

    } catch (err) {
      console.error('Dashboard data fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Live auto-polling every 25 seconds if enabled
  useEffect(() => {
    if (!isLiveEnabled) return;
    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 25000);
    return () => clearInterval(interval);
  }, [isLiveEnabled, fetchDashboardData]);

  // Helper: Format relative timestamp
  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Just now';
    try {
      const cleanDate = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
      const isoStr = cleanDate.endsWith('Z') ? cleanDate : cleanDate + 'Z';
      const date = new Date(isoStr);
      if (isNaN(date.getTime())) return dateStr;

      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      if (seconds < 45) return 'Just now';
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
      if (seconds < 172800) return 'Yesterday';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Helper: Categorize activity and render rich icon badge
  const getActivityMeta = (action: string) => {
    const act = (action || '').toLowerCase();
    if (act.includes('payment') || act.includes('paid')) {
      return {
        tag: 'Payment',
        icon: CreditCard,
        bg: 'bg-emerald-50 text-emerald-600 ring-emerald-200/60',
        dot: 'bg-emerald-500'
      };
    }
    if (act.includes('invoice')) {
      return {
        tag: 'Invoice',
        icon: Receipt,
        bg: 'bg-indigo-50 text-indigo-600 ring-indigo-200/60',
        dot: 'bg-indigo-500'
      };
    }
    if (act.includes('quote') || act.includes('quotation')) {
      return {
        tag: 'Quotation',
        icon: FileText,
        bg: 'bg-sky-50 text-sky-600 ring-sky-200/60',
        dot: 'bg-sky-500'
      };
    }
    if (act.includes('project')) {
      return {
        tag: 'Project',
        icon: FolderKanban,
        bg: 'bg-amber-50 text-amber-600 ring-amber-200/60',
        dot: 'bg-amber-500'
      };
    }
    if (act.includes('team') || act.includes('user') || act.includes('member')) {
      return {
        tag: 'Team',
        icon: Users,
        bg: 'bg-purple-50 text-purple-600 ring-purple-200/60',
        dot: 'bg-purple-500'
      };
    }
    return {
      tag: 'System',
      icon: Sparkles,
      bg: 'bg-slate-50 text-slate-600 ring-slate-200/60',
      dot: 'bg-slate-400'
    };
  };

  // Metric Cards Definition
  const metrics = [
    {
      title: "TOTAL CLIENTS",
      value: stats.totalClients.toString(),
      icon: Users,
      badgeText: "Active Portfolio",
      link: "/clients",
      colorClass: "bg-indigo-50 text-indigo-600 ring-indigo-100",
      accentBar: "from-indigo-500 to-indigo-600"
    },
    {
      title: "ACTIVE PROJECTS",
      value: stats.activeProjects.toString(),
      icon: Briefcase,
      badgeText: `${stats.activeProjects} of ${stats.allProjects || stats.activeProjects} In Flight`,
      link: "/projects",
      colorClass: "bg-emerald-50 text-emerald-600 ring-emerald-100",
      accentBar: "from-emerald-500 to-emerald-600"
    },
    {
      title: "ALL PROJECTS",
      value: stats.allProjects.toString(),
      icon: FolderKanban,
      badgeText: "Total Deliverables",
      link: "/projects",
      colorClass: "bg-sky-50 text-sky-600 ring-sky-100",
      accentBar: "from-sky-500 to-sky-600"
    },
    {
      title: "REVENUE COLLECTED",
      value: `Rs. ${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Banknote,
      badgeText: stats.pendingRevenue ? `Rs. ${stats.pendingRevenue.toLocaleString()} Pending` : "Cleared Settlements",
      link: "/financials",
      colorClass: "bg-amber-50 text-amber-600 ring-amber-200/80",
      accentBar: "from-amber-400 to-amber-500"
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Top Header / Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Executive Dashboard</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 normal-case">{todayFormatted}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {greeting}, {user?.name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time operational metrics, project milestones, and client financials.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs active:scale-95 disabled:opacity-50"
            title="Refresh dashboard metrics"
            aria-label="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-xs hover:shadow transition-all active:scale-95 text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid: 2-columns on mobile, 4-columns on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {metrics.map((metric, i) => (
          <Link
            to={metric.link}
            key={i}
            className="group relative bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between overflow-hidden"
          >
            {/* Top accent glow line */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${metric.accentBar} opacity-80 group-hover:h-1.5 transition-all`} />

            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 tracking-wider uppercase truncate">
                {metric.title}
              </span>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ring-1 shrink-0 ${metric.colorClass} transition-transform group-hover:scale-105`}>
                <metric.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            <div className="mt-1">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight truncate">
                {metric.value}
              </h3>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-medium text-slate-500 truncate">
                  {metric.badgeText}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Grid: Left Column (Quick Actions & Deadlines) + Right Column (Recent Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Quick Actions & Deadlines */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Quick Actions Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center ring-1 ring-amber-200/60">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">Quick Actions</h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">Agency Shortcuts</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
              <Link 
                to="/invoices/new" 
                className="group flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/90 border border-slate-200/70 rounded-xl p-3.5 transition-all duration-150 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs group-hover:border-amber-400 group-hover:text-amber-600 transition-colors">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-xs sm:text-sm text-slate-800 group-hover:text-slate-950">Create New Invoice</span>
                    <span className="block text-[11px] text-slate-500">Bill client & log terms</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all" />
              </Link>
              
              <button 
                onClick={() => setIsProjectModalOpen(true)}
                className="group flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/90 border border-slate-200/70 rounded-xl p-3.5 transition-all duration-150 active:scale-[0.99] text-left w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs group-hover:border-amber-400 group-hover:text-amber-600 transition-colors">
                    <FolderPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-xs sm:text-sm text-slate-800 group-hover:text-slate-950">Add New Project</span>
                    <span className="block text-[11px] text-slate-500">Set budget & milestones</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button 
                onClick={() => setIsTeamModalOpen(true)}
                className="group flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/90 border border-slate-200/70 rounded-xl p-3.5 transition-all duration-150 active:scale-[0.99] text-left w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs group-hover:border-amber-400 group-hover:text-amber-600 transition-colors">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-xs sm:text-sm text-slate-800 group-hover:text-slate-950">Add Team Member</span>
                    <span className="block text-[11px] text-slate-500">Invite employee or freelancer</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all" />
              </button>

              <Link 
                to="/reports" 
                className="group flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/90 border border-slate-200/70 rounded-xl p-3.5 transition-all duration-150 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs group-hover:border-amber-400 group-hover:text-amber-600 transition-colors">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-xs sm:text-sm text-slate-800 group-hover:text-slate-950">View Financial Reports</span>
                    <span className="block text-[11px] text-slate-500">Revenue, invoices & margins</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </div>
          
          {/* Upcoming Deadlines (Real Logic & Data!) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center ring-1 ring-indigo-200/60">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">Upcoming Deadlines</h3>
              </div>
              <Link 
                to="/projects" 
                className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100/80 px-2.5 py-1 rounded-lg transition-colors"
              >
                View All
              </Link>
            </div>

            {deadlines.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800">All caught up</h4>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 max-w-[240px]">
                  No upcoming project or task deadlines due in the next 14 days.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {deadlines.map((item) => {
                  const isOverdue = item.daysRemaining < 0;
                  const isToday = item.daysRemaining === 0;
                  const isUrgent = item.daysRemaining > 0 && item.daysRemaining <= 3;

                  return (
                    <Link
                      key={`${item.type}-${item.id}`}
                      to={item.link}
                      className="group flex items-center justify-between p-3 rounded-xl border border-slate-200/70 hover:border-slate-300 hover:bg-slate-50 transition-all"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            item.type === 'project' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.type}
                          </span>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-800 truncate group-hover:text-amber-600 transition-colors">
                            {item.title}
                          </h4>
                        </div>
                        {item.subtitle && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.subtitle}</p>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isOverdue 
                            ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' 
                            : isToday 
                              ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                              : isUrgent
                                ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
                                : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isOverdue 
                            ? `${Math.abs(item.daysRemaining)}d overdue` 
                            : isToday 
                              ? 'Due Today' 
                              : `In ${item.daysRemaining}d`}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center ring-1 ring-emerald-200/60">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">Recent Activity</h3>
                <p className="text-[11px] text-slate-500 hidden sm:block">Real-time log of administrative events</p>
              </div>
            </div>

            {/* Live Updates Toggle Button */}
            <button
              onClick={() => {
                setIsLiveEnabled(!isLiveEnabled);
                fetchDashboardData(true);
              }}
              className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full transition-all border ${
                isLiveEnabled 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
              title={isLiveEnabled ? "Live polling active (Click to pause)" : "Click to activate live polling"}
            >
              <span className={`w-2 h-2 rounded-full ${isLiveEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{isLiveEnabled ? 'Live Updates' : 'Paused'}</span>
            </button>
          </div>

          {/* Activity Timeline Content */}
          <div className="p-5 sm:p-6 flex-1 flex flex-col justify-start">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mb-2" />
                <p className="text-xs font-semibold">Streaming activity feed...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-14">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                  <Inbox className="w-6 h-6" />
                </div>
                <h4 className="text-slate-800 font-bold text-sm">No recent activity</h4>
                <p className="text-slate-500 text-xs mt-1 max-w-xs">
                  When invoices are created, payments are recorded, or projects change, updates will stream here.
                </p>
              </div>
            ) : (
              <div className="relative pl-2 sm:pl-3 space-y-6">
                {activities.map((activity, i) => {
                  const meta = getActivityMeta(activity.action);
                  const isLast = i === activities.length - 1;
                  const author = activity.user?.displayName || activity.user?.name || 'System';

                  return (
                    <div key={activity.id || i} className="relative flex items-start gap-3.5 group">
                      {/* Timeline Connector Line */}
                      {!isLast && (
                        <div className="absolute top-6 left-3 -ml-[1px] w-[2px] bottom-0 bg-slate-200/80 group-hover:bg-slate-300 transition-colors" />
                      )}

                      {/* Icon Node */}
                      <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white ${meta.bg}`}>
                        <meta.icon className="w-3 h-3" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 bg-slate-50/50 hover:bg-slate-50 rounded-xl p-3 border border-slate-100 transition-colors">
                        <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-900">{author}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full ${meta.bg}`}>
                              {meta.tag}
                            </span>
                          </div>
                          <span 
                            className="text-[11px] font-medium text-slate-400"
                            title={activity.createdAt}
                          >
                            {formatTimeAgo(activity.createdAt)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed break-words font-medium">
                          {activity.action}
                        </p>

                        {activity.description && (
                          <p className="text-[11px] text-slate-500 mt-1 italic">
                            {activity.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Project Modal for Quick Project Creation */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSaved={() => {
          setIsProjectModalOpen(false);
          fetchDashboardData(true);
        }}
      />

      {/* Team Modal for Quick Team Member Addition */}
      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onSaved={() => {
          setIsTeamModalOpen(false);
          fetchDashboardData(true);
        }}
      />
    </div>
  );
}
