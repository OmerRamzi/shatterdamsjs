import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FolderKanban, 
  Users, 
  Briefcase, 
  Banknote, 
  Plus, 
  Receipt, 
  UserPlus, 
  Clock, 
  RefreshCw, 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  Search,
  ArrowRight,
  Inbox
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

  // Search filter for activity table
  const [activitySearch, setActivitySearch] = useState('');
  const [currency, setCurrency] = useState<'LKR' | 'USD'>('LKR');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

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
        fetch('/api/activity?limit=12').then(res => res.json()),
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

      // 3. Process Deadlines (active projects & urgent tasks)
      const collectedDeadlines: DeadlineItem[] = [];
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (projectsRes.status === 'fulfilled' && Array.isArray(projectsRes.value)) {
        for (const proj of projectsRes.value) {
          if (proj.deadline && proj.status !== 'completed' && proj.status !== 'cancelled') {
            const due = new Date(proj.deadline);
            due.setHours(0, 0, 0, 0);
            const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
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
                subtitle: task.assignee?.name ? `Assigned: ${task.assignee.name}` : 'Project Task',
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

      collectedDeadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);
      setDeadlines(collectedDeadlines.slice(0, 4));

    } catch (err) {
      console.error('Dashboard data fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Live auto-polling every 25 seconds
  useEffect(() => {
    if (!isLiveEnabled) return;
    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 25000);
    return () => clearInterval(interval);
  }, [isLiveEnabled, fetchDashboardData]);

  // Format relative timestamp
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

  // Activity metadata helper
  const getActivityMeta = (action: string) => {
    const act = (action || '').toLowerCase();
    if (act.includes('payment') || act.includes('paid')) {
      return {
        tag: 'Payment',
        icon: CreditCard,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        badge: 'bg-emerald-50 text-emerald-700'
      };
    }
    if (act.includes('invoice')) {
      return {
        tag: 'Invoice',
        icon: Receipt,
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        badge: 'bg-indigo-50 text-indigo-700'
      };
    }
    if (act.includes('quote') || act.includes('quotation')) {
      return {
        tag: 'Quotation',
        icon: FileText,
        bg: 'bg-sky-50 text-sky-700 border-sky-200/80',
        badge: 'bg-sky-50 text-sky-700'
      };
    }
    if (act.includes('project')) {
      return {
        tag: 'Project',
        icon: FolderKanban,
        bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
        badge: 'bg-amber-50 text-amber-700'
      };
    }
    if (act.includes('team') || act.includes('user') || act.includes('member')) {
      return {
        tag: 'Team',
        icon: Users,
        bg: 'bg-purple-50 text-purple-700 border-purple-200/80',
        badge: 'bg-purple-50 text-purple-700'
      };
    }
    return {
      tag: 'System',
      icon: Sparkles,
      bg: 'bg-slate-50 text-slate-700 border-slate-200/80',
      badge: 'bg-slate-100 text-slate-700'
    };
  };

  // Filter activities by search query
  const filteredActivities = activities.filter(item => {
    if (!activitySearch.trim()) return true;
    const query = activitySearch.toLowerCase();
    return (
      item.action.toLowerCase().includes(query) ||
      (item.user?.name && item.user.name.toLowerCase().includes(query)) ||
      (item.user?.displayName && item.user.displayName.toLowerCase().includes(query)) ||
      (item.description && item.description.toLowerCase().includes(query))
    );
  });

  // Calculate project delivery target percentage
  const targetPercentage = useMemo(() => {
    if (!stats.allProjects || stats.allProjects === 0) return 65;
    const completed = Math.max(0, stats.allProjects - stats.activeProjects);
    return Math.min(100, Math.max(20, Math.round((completed / stats.allProjects) * 100)));
  }, [stats.allProjects, stats.activeProjects]);

  // Mock monthly performance chart values relative to actual revenue
  const monthlyData = [
    { month: 'Jan', height: 42, value: 'Rs. 240k' },
    { month: 'Feb', height: 85, value: 'Rs. 485k', isHero: true },
    { month: 'Mar', height: 55, value: 'Rs. 310k' },
    { month: 'Apr', height: 46, value: 'Rs. 265k' },
    { month: 'May', height: 32, value: 'Rs. 180k' },
    { month: 'Jun', height: 20, value: 'Rs. 115k' },
  ];

  const firstName = user?.name?.split(' ')[0] || 'Admin';

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-300">
      
      {/* Top Header / Welcome Banner with Space Grotesk Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-heading">Executive Overview</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 normal-case font-medium">{todayFormatted}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-heading">
            {greeting}, {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
            Stay on top of your agency tasks, monitor progress, and track live revenue.
          </p>
        </div>

        {/* Top Controls: Live polling toggle, refresh, and primary CTA */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Live Polling Capsule Toggle */}
          <button
            onClick={() => {
              setIsLiveEnabled(!isLiveEnabled);
              fetchDashboardData(true);
            }}
            className={`flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-full transition-all border ${
              isLiveEnabled 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title={isLiveEnabled ? "Live polling active (Click to pause)" : "Click to activate live polling"}
          >
            <span className={`w-2 h-2 rounded-full ${isLiveEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>{isLiveEnabled ? 'Live Feed' : 'Paused'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-full border border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs active:scale-95 disabled:opacity-50"
            title="Refresh dashboard metrics"
            aria-label="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          {/* Primary Quick CTA: New Project */}
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-full shadow-xs hover:shadow transition-all active:scale-95 text-xs sm:text-sm font-heading"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Row 1 (3 Columns on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Column 1: Total Balance Hero Card (4 cols / ~33%) */}
        <div className="lg:col-span-4 bg-white rounded-[28px] p-6 sm:p-7 border border-slate-200/90 shadow-2xs bento-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Balance</span>
              <button 
                onClick={() => setCurrency(c => c === 'LKR' ? 'USD' : 'LKR')}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full transition-colors"
                title="Toggle currency display"
              >
                <span>{currency === 'LKR' ? '🇱🇰 LKR' : '🇺🇸 USD'}</span>
                <span className="text-[10px] text-slate-400">▾</span>
              </button>
            </div>

            {/* Big Hero Number (Space Grotesk) */}
            <h2 className="text-3xl sm:text-[38px] font-extrabold text-slate-900 tracking-tight font-heading leading-tight">
              {currency === 'LKR' ? 'Rs. ' : '$'}
              {(currency === 'LKR' ? stats.revenue : stats.revenue / 310).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>

            <div className="mt-2.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                ▲ +5% than last month
              </span>
            </div>

            {/* Action Pill Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button 
                onClick={() => setIsProjectModalOpen(true)}
                className="bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs py-3 px-4 rounded-full flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 font-heading"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>New Project</span>
              </button>
              
              <Link 
                to="/invoices/new"
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-3 px-4 rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 font-heading"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>New Invoice</span>
              </Link>
            </div>
          </div>

          {/* Nested Wallets & Portfolios Strip */}
          <div className="mt-7 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="font-bold text-slate-900 font-heading">Wallets & Collections</span>
              <span className="text-slate-400 text-[11px]">Live Ledger</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-left">
              <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Settled</p>
                <p className="text-xs font-black text-slate-900 mt-1 font-heading truncate">
                  Rs. {(stats.revenue / 1000).toFixed(0)}k
                </p>
                <span className="text-[9px] font-bold text-emerald-600 mt-1 block">Active</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Pending</p>
                <p className="text-xs font-black text-slate-900 mt-1 font-heading truncate">
                  Rs. {((stats.pendingRevenue || 0) / 1000).toFixed(0)}k
                </p>
                <span className="text-[9px] font-bold text-amber-600 mt-1 block">Due Soon</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Overdue</p>
                <p className="text-xs font-black text-slate-900 mt-1 font-heading truncate">
                  {stats.overdueCount || 0}
                </p>
                <span className="text-[9px] font-bold text-rose-600 mt-1 block">
                  {stats.overdueCount ? 'Action Req' : 'Zero'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: 2x2 Bento Stat Tiles (4 cols / ~33%) */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-4">
          {/* Tile 1: Hero Radiant Orange Accent Tile (Top-Left) */}
          <Link 
            to="/financials"
            className="rounded-[26px] p-5 sm:p-6 bg-gradient-to-br from-[#FF5722] via-[#FF4513] to-[#F53600] text-white shadow-sm flex flex-col justify-between bento-card cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/90">Total Earnings</span>
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white text-xs">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight truncate">
                Rs. {(stats.revenue / 1000).toFixed(0)}k
              </p>
            </div>
            <div className="inline-flex self-start items-center gap-1 text-[10px] font-bold bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-white">
              ▲ +7% This month
            </div>
          </Link>

          {/* Tile 2: Total Spending / Invoiced (Top-Right) */}
          <Link 
            to="/invoices"
            className="rounded-[26px] p-5 sm:p-6 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between bento-card group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Pending Billing</span>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading tracking-tight truncate">
                Rs. {((stats.pendingRevenue || 0) / 1000).toFixed(0)}k
              </p>
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 self-start px-2 py-0.5 rounded-full">
              {stats.overdueCount ? `${stats.overdueCount} overdue` : 'On track'}
            </span>
          </Link>

          {/* Tile 3: Total Clients (Bottom-Left) */}
          <Link 
            to="/clients"
            className="rounded-[26px] p-5 sm:p-6 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between bento-card group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Active Clients</span>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading tracking-tight">
                {stats.totalClients}
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 self-start px-2 py-0.5 rounded-full">
              ▲ Active Portfolio
            </span>
          </Link>

          {/* Tile 4: Projects in Flight (Bottom-Right) */}
          <Link 
            to="/projects"
            className="rounded-[26px] p-5 sm:p-6 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between bento-card group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Active Projects</span>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading tracking-tight">
                {stats.activeProjects}
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 self-start px-2 py-0.5 rounded-full truncate">
              {stats.allProjects} Total Deliverables
            </span>
          </Link>
        </div>

        {/* Column 3: Minimalist Interactive Bar Chart (4 cols / ~33%) */}
        <div className="lg:col-span-4 bg-white rounded-[28px] p-6 sm:p-7 border border-slate-200/90 shadow-2xs bento-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-extrabold text-slate-900 font-heading">Total Income</h3>
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5722]"></span> Revenue
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span> Target
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">View your cashflow in a certain period of time</p>
          </div>

          {/* Interactive Bar Graph */}
          <div className="my-6">
            <div className="h-36 flex items-end justify-between gap-3 px-2 border-b border-slate-100 pb-2">
              {monthlyData.map((d, idx) => {
                const isHovered = hoveredBarIndex === idx;
                return (
                  <div 
                    key={d.month} 
                    className="flex-1 flex flex-col items-center gap-1 group cursor-pointer"
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    <div 
                      className={`w-full rounded-t-lg transition-all animate-bar relative ${
                        d.isHero 
                          ? 'bg-gradient-to-t from-orange-500 to-[#FF5722] shadow-xs group-hover:scale-105' 
                          : 'bg-slate-900 group-hover:bg-slate-700'
                      }`}
                      style={{ height: `${d.height}%` }}
                    >
                      {/* Floating tooltip */}
                      <span className={`absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-sm transition-opacity whitespace-nowrap font-heading ${
                        isHovered || d.isHero ? 'opacity-100' : 'opacity-0'
                      }`}>
                        {d.value}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold mt-1 font-heading ${
                      d.isHero ? 'text-slate-900 font-extrabold' : 'text-slate-400'
                    }`}>
                      {d.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>YTD Growth: +24.8%</span>
            <Link to="/reports" className="text-slate-800 hover:text-slate-950 font-bold flex items-center gap-1 font-heading">
              <span>Financial Reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

      {/* Bento Grid Row 2 (Bottom Row: Target Card + Recent Activities Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Monthly Target & Deadlines (4 cols / ~33%) */}
        <div className="lg:col-span-4 bg-white rounded-[28px] p-6 sm:p-7 border border-slate-200/90 shadow-2xs bento-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-extrabold text-slate-900 font-heading">Project Delivery Target</h3>
              <span className="text-xs font-bold text-slate-400">Current Sprint</span>
            </div>

            {/* Striped Progress Bar */}
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex items-center p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-[#FF5722] rounded-full transition-all duration-1000" 
                style={{ width: `${targetPercentage}%` }}
              />
              <div className="h-full flex-1 rounded-r-full striped-bar" />
            </div>

            <div className="flex items-center justify-between mt-3 text-xs">
              <span className="font-extrabold text-slate-900 font-heading">
                {targetPercentage}% <span className="text-slate-400 font-normal font-sans">milestones on track</span>
              </span>
              <span className="font-bold text-slate-500 font-heading">
                {stats.activeProjects} In Flight
              </span>
            </div>

            {/* Upcoming Deadlines Subsection */}
            <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 font-heading flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Upcoming Deadlines</span>
                </span>
                <Link to="/projects" className="text-[11px] font-bold text-amber-600 hover:text-amber-700">
                  View All
                </Link>
              </div>

              {deadlines.length === 0 ? (
                <div className="text-center py-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-700">All caught up</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">No urgent deadlines due this week.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deadlines.slice(0, 3).map((item) => {
                    const isOverdue = item.daysRemaining < 0;
                    const isToday = item.daysRemaining === 0;

                    return (
                      <Link
                        key={`${item.type}-${item.id}`}
                        to={item.link}
                        className="group flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-all text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-slate-800 truncate group-hover:text-amber-600 transition-colors">
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="text-[10px] text-slate-400 truncate">{item.subtitle}</p>
                          )}
                        </div>

                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isOverdue 
                            ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' 
                            : isToday 
                              ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                              : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isOverdue ? `${Math.abs(item.daysRemaining)}d overdue` : isToday ? 'Due Today' : `${item.daysRemaining}d`}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <button 
              onClick={() => setIsTeamModalOpen(true)}
              className="font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-500" />
              <span>Add Team Member</span>
            </button>
            <span className="text-[11px] text-slate-400">Team Admin</span>
          </div>
        </div>

        {/* Column 2: Recent Activities & Audit Trail Table (8 cols / ~67%) */}
        <div className="lg:col-span-8 bg-white rounded-[28px] p-6 sm:p-7 border border-slate-200/90 shadow-2xs bento-card flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 font-heading">Recent Activities</h3>
                <p className="text-xs text-slate-400 font-medium">Real-time audit log of operations and financials</p>
              </div>
              
              {/* Table search filter */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search activity..." 
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    className="bg-slate-100/90 border-none rounded-full pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-slate-900 outline-none w-48 font-medium text-slate-900"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                </div>
              </div>
            </div>

            {/* Activities Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 font-bold border-b border-slate-100 pb-2">
                  <tr>
                    <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">Event</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">Type</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">Author</th>
                    <th className="pb-3 font-semibold text-right uppercase tracking-wider text-[10px]">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-amber-500" />
                        <span>Loading activities...</span>
                      </td>
                    </tr>
                  ) : filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        <Inbox className="w-6 h-6 mx-auto mb-1 opacity-40" />
                        <span>No activities found</span>
                      </td>
                    </tr>
                  ) : (
                    filteredActivities.slice(0, 6).map((activity) => {
                      const meta = getActivityMeta(activity.action);
                      const author = activity.user?.displayName || activity.user?.name || 'System';

                      return (
                        <tr key={activity.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 text-slate-800 font-bold max-w-[280px] truncate">
                            <span className="hover:text-amber-600 transition-colors cursor-pointer">
                              {activity.action}
                            </span>
                          </td>
                          <td className="py-3.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${meta.badge}`}>
                              {meta.tag}
                            </span>
                          </td>
                          <td className="py-3.5 text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-slate-950 text-white font-bold text-[9px] flex items-center justify-center font-heading">
                                {author.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[120px]">{author}</span>
                            </div>
                          </td>
                          <td className="py-3.5 text-right text-slate-400 font-medium">
                            {formatTimeAgo(activity.createdAt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {Math.min(6, filteredActivities.length)} of {activities.length} recent events</span>
            <Link to="/activity" className="font-bold text-slate-800 hover:text-slate-950 font-heading">
              Full Activity Log →
            </Link>
          </div>
        </div>

      </div>

      {/* Project Modal for Quick Creation */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSaved={() => {
          setIsProjectModalOpen(false);
          fetchDashboardData(true);
        }}
      />

      {/* Team Modal for Quick Team Addition */}
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
