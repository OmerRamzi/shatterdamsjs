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

export interface MonthlyChartItem {
  month: string;
  year: number;
  revenue: number;
  height: number;
  value: string;
  isHero: boolean;
}

export interface MonthGrowth {
  percentage: number | null;
  label: string;
  isPositive: boolean;
}

export interface YtdStats {
  revenue: number;
  growthPercent: number | null;
  label: string;
}

export interface DashboardStats {
  totalClients: number;
  newClientsThisMonth?: number;
  activeProjects: number;
  completedProjects?: number;
  allProjects: number;
  totalTasks?: number;
  completedTasks?: number;
  deliveryRate?: number;
  revenue: number;
  pendingRevenue: number;
  overdueCount: number;
  thisMonthRevenue?: number;
  monthOverMonthGrowth?: MonthGrowth;
  thisMonthLabel?: string;
  ytd?: YtdStats;
  monthlyChart?: MonthlyChartItem[];
  currencyCode?: string;
  currencySymbol?: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    newClientsThisMonth: 0,
    activeProjects: 0,
    completedProjects: 0,
    allProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    deliveryRate: 0,
    revenue: 0,
    pendingRevenue: 0,
    overdueCount: 0,
    thisMonthRevenue: 0,
    monthOverMonthGrowth: {
      percentage: 0,
      label: '0% vs last month',
      isPositive: true,
    },
    thisMonthLabel: 'Active this month',
    ytd: {
      revenue: 0,
      growthPercent: null,
      label: 'YTD Growth: 0%',
    },
    monthlyChart: [],
    currencyCode: 'LKR',
    currencySymbol: 'Rs.',
  });
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLiveEnabled, setIsLiveEnabled] = useState(true);

  // Search filter for activity table
  const [activitySearch, setActivitySearch] = useState('');
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
    if (stats.deliveryRate !== undefined) return stats.deliveryRate;
    if (!stats.allProjects || stats.allProjects === 0) return 0;
    const completed = stats.completedProjects !== undefined
      ? stats.completedProjects
      : Math.max(0, stats.allProjects - stats.activeProjects);
    return Math.min(100, Math.round((completed / stats.allProjects) * 100));
  }, [stats.deliveryRate, stats.allProjects, stats.activeProjects, stats.completedProjects]);

  const currencySymbol = stats.currencySymbol || 'Rs.';
  const currencyCode = stats.currencyCode || 'LKR';

  // Dynamic 6-month chart data
  const monthlyChartData = useMemo(() => {
    if (stats.monthlyChart && stats.monthlyChart.length > 0) {
      return stats.monthlyChart;
    }
    const months: MonthlyChartItem[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        year: d.getFullYear(),
        revenue: 0,
        height: 6,
        value: `${currencySymbol} 0`,
        isHero: i === 0,
      });
    }
    return months;
  }, [stats.monthlyChart, currencySymbol]);

  const formatShortAmount = (amount: number | string | undefined) => {
    const val = Number(amount || 0);
    if (val >= 1000000) return `${currencySymbol} ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${currencySymbol} ${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}k`;
    return `${currencySymbol} ${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const firstName = user?.name?.split(' ')[0] || 'Admin';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header / Studio Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-1">
            Studio Overview — {todayFormatted}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 font-heading">
            {greeting}, {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Operations, active deliverables, and studio cashflow.
          </p>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Live Polling Toggle */}
          <button
            onClick={() => {
              setIsLiveEnabled(!isLiveEnabled);
              fetchDashboardData(true);
            }}
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border ${
              isLiveEnabled 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title={isLiveEnabled ? "Live polling active (Click to pause)" : "Click to activate live polling"}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLiveEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span>{isLiveEnabled ? 'Live feed' : 'Paused'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Refresh dashboard metrics"
            aria-label="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-yellow-500' : ''}`} />
          </button>

          {/* Primary Quick CTA: New Project */}
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-lg shadow-xs transition-colors text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New project</span>
          </button>
        </div>
      </div>

      {/* Grid Row 1 (3 Columns on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Column 1: Total Balance Card (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Total balance</span>
              <div 
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md"
                title={`Tenant Base Currency: ${currencyCode}`}
              >
                <span>{currencyCode === 'USD' ? 'USD' : currencyCode === 'EUR' ? 'EUR' : currencyCode === 'GBP' ? 'GBP' : currencyCode === 'AUD' ? 'AUD' : 'LKR'}</span>
                <span className="text-[10px] text-slate-400">Base</span>
              </div>
            </div>

            {/* Big Hero Number (Space Grotesk) */}
            <h2 className="text-3xl sm:text-[34px] font-bold text-slate-950 tracking-tight font-heading leading-tight">
              {currencySymbol} {Number(stats.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>

            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
                stats.monthOverMonthGrowth?.isPositive 
                  ? 'text-emerald-700 bg-emerald-50' 
                  : 'text-rose-700 bg-rose-50'
              }`}>
                {stats.monthOverMonthGrowth?.isPositive ? '↑' : '↓'} {stats.monthOverMonthGrowth?.label || '0% vs last month'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 mt-5">
              <button 
                onClick={() => setIsProjectModalOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New project</span>
              </button>
              
              <Link 
                to="/invoices/new"
                className="bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-semibold text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-center"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>New invoice</span>
              </Link>
            </div>
          </div>

          {/* Cashflow Breakdown Strip */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-2.5">
              <span className="font-semibold text-slate-900">Cashflow status</span>
              <span className="text-slate-400 text-[11px]">Ledger</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-left">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-medium text-slate-500">Settled</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5 font-heading truncate">
                  {formatShortAmount(stats.revenue)}
                </p>
                <span className="text-[10px] font-medium text-emerald-600 mt-0.5 block">Active</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-medium text-slate-500">Pending</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5 font-heading truncate">
                  {formatShortAmount(stats.pendingRevenue)}
                </p>
                <span className={`text-[10px] font-medium mt-0.5 block ${stats.pendingRevenue > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {stats.pendingRevenue > 0 ? 'Due soon' : 'Cleared'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-medium text-slate-500">Overdue</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5 font-heading truncate">
                  {stats.overdueCount || 0}
                </p>
                <span className={`text-[10px] font-medium mt-0.5 block ${stats.overdueCount ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {stats.overdueCount ? `${stats.overdueCount} require action` : 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: 2x2 Stat Tiles (4 cols) */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-3.5">
          {/* Tile 1: Total Earnings (Obsidian Studio Tile) */}
          <Link 
            to="/financials"
            className="rounded-xl p-5 bg-[#101216] text-white border border-white/10 shadow-xs flex flex-col justify-between group hover:border-yellow-400/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">Total earnings</span>
              <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-yellow-400">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <p className="text-2xl font-bold text-white font-heading tracking-tight truncate">
                {formatShortAmount(stats.revenue)}
              </p>
            </div>
            <div className="text-[10px] font-medium text-slate-400">
              {stats.thisMonthLabel || 'Live revenue'}
            </div>
          </Link>

          {/* Tile 2: Pending Invoices */}
          <Link 
            to="/invoices"
            className="rounded-xl p-5 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between group hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Pending billing</span>
              <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <p className="text-2xl font-bold text-slate-900 font-heading tracking-tight truncate">
                {formatShortAmount(stats.pendingRevenue)}
              </p>
            </div>
            <span className={`text-[10px] font-medium self-start px-2 py-0.5 rounded ${
              stats.overdueCount 
                ? 'text-rose-700 bg-rose-50' 
                : stats.pendingRevenue > 0 
                  ? 'text-amber-700 bg-amber-50' 
                  : 'text-emerald-700 bg-emerald-50'
            }`}>
              {stats.overdueCount ? `${stats.overdueCount} overdue` : stats.pendingRevenue > 0 ? 'Due soon' : 'All settled'}
            </span>
          </Link>

          {/* Tile 3: Active Clients */}
          <Link 
            to="/clients"
            className="rounded-xl p-5 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between group hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Active clients</span>
              <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <p className="text-2xl font-bold text-slate-900 font-heading tracking-tight">
                {stats.totalClients}
              </p>
            </div>
            <span className="text-[10px] font-medium text-slate-500">
              {stats.newClientsThisMonth ? `+${stats.newClientsThisMonth} this month` : 'Total registered'}
            </span>
          </Link>

          {/* Tile 4: Active Projects */}
          <Link 
            to="/projects"
            className="rounded-xl p-5 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between group hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Active projects</span>
              <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <p className="text-2xl font-bold text-slate-900 font-heading tracking-tight">
                {stats.activeProjects}
              </p>
            </div>
            <span className="text-[10px] font-medium text-slate-500 truncate">
              {stats.allProjects} total deliverables
            </span>
          </Link>
        </div>

        {/* Column 3: 6-Month Income Chart (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-slate-950 font-heading">Income breakdown</h3>
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-slate-900">
                  <span className="w-2 h-2 rounded-full bg-yellow-400"></span> Current
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-slate-800"></span> Previous
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500">Past 6 months cashflow</p>
          </div>

          {/* Clean Bar Graph */}
          <div className="my-5">
            <div className="h-32 flex items-end justify-between gap-3 px-1 border-b border-slate-100 pb-2">
              {monthlyChartData.map((d, idx) => {
                const isHovered = hoveredBarIndex === idx;
                return (
                  <div 
                    key={`${d.month}-${d.year}`} 
                    className="flex-1 flex flex-col items-center gap-1 group cursor-pointer"
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    <div 
                      className={`w-full rounded-t transition-all animate-bar relative ${
                        d.isHero 
                          ? 'bg-yellow-400 hover:bg-yellow-300' 
                          : 'bg-slate-800 hover:bg-slate-700'
                      }`}
                      style={{ height: `${Math.max(8, d.height)}%` }}
                    >
                      {/* Tooltip on hover */}
                      <span className={`absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-sm transition-opacity whitespace-nowrap pointer-events-none ${
                        isHovered || d.isHero ? 'opacity-100' : 'opacity-0'
                      }`}>
                        {d.value}
                      </span>
                    </div>
                    <span className={`text-[10px] font-medium mt-1 ${
                      d.isHero ? 'text-slate-900 font-bold' : 'text-slate-400'
                    }`}>
                      {d.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{stats.ytd?.label || 'YTD Growth: 0%'}</span>
            <Link to="/reports" className="text-slate-900 hover:text-slate-700 font-semibold flex items-center gap-1">
              <span>Financial reports</span>
            </Link>
          </div>
        </div>

      </div>

      {/* Grid Row 2 (Bottom Row: Target Card + Recent Activities Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Project Target & Deadlines (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-950 font-heading">Deliverables progress</h3>
              <span className="text-xs text-slate-400">Current sprint</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex items-center">
              <div 
                className="h-full bg-yellow-400 rounded-full transition-all duration-700" 
                style={{ width: `${targetPercentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-2.5 text-xs">
              <span className="font-semibold text-slate-900">
                {targetPercentage}% <span className="text-slate-400 font-normal">
                  {stats.totalTasks ? `(${stats.completedTasks || 0}/${stats.totalTasks} tasks)` : 'milestones'}
                </span>
              </span>
              <span className="text-slate-500">
                {stats.activeProjects} in flight
              </span>
            </div>

            {/* Upcoming Deadlines Subsection */}
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-yellow-600" />
                  <span>Upcoming deadlines</span>
                </span>
                <Link to="/projects" className="text-xs font-semibold text-yellow-600 hover:text-yellow-700">
                  View all
                </Link>
              </div>

              {deadlines.length === 0 ? (
                <div className="text-center py-4 bg-slate-50 rounded-lg border border-slate-100">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-slate-700">No overdue deliverables</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">All tasks are on track for this sprint.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {deadlines.slice(0, 3).map((item) => {
                    const isOverdue = item.daysRemaining < 0;
                    const isToday = item.daysRemaining === 0;

                    return (
                      <Link
                        key={`${item.type}-${item.id}`}
                        to={item.link}
                        className="group flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-slate-800 truncate group-hover:text-yellow-600 transition-colors">
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="text-[10px] text-slate-400 truncate">{item.subtitle}</p>
                          )}
                        </div>

                        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isOverdue 
                            ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                            : isToday 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isOverdue ? `${Math.abs(item.daysRemaining)}d overdue` : isToday ? 'Due today' : `${item.daysRemaining}d`}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <button 
              onClick={() => setIsTeamModalOpen(true)}
              className="font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-yellow-600" />
              <span>Add team member</span>
            </button>
            <span className="text-[11px] text-slate-400">Team</span>
          </div>
        </div>

        {/* Column 2: Recent Activities Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-950 font-heading">Recent activity</h3>
                <p className="text-xs text-slate-500">Live operational events and updates</p>
              </div>
              
              {/* Table search filter */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Filter activity..." 
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-xs focus:ring-1 focus:ring-yellow-400 focus:outline-none w-48 text-slate-900"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                </div>
              </div>
            </div>

            {/* Activities Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="pb-2.5 font-medium">Event</th>
                    <th className="pb-2.5 font-medium">Type</th>
                    <th className="pb-2.5 font-medium">Author</th>
                    <th className="pb-2.5 font-medium text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-yellow-500" />
                        <span>Loading activities...</span>
                      </td>
                    </tr>
                  ) : filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        <Inbox className="w-5 h-5 mx-auto mb-1 opacity-40" />
                        <span>No recent activities</span>
                      </td>
                    </tr>
                  ) : (
                    filteredActivities.slice(0, 6).map((activity) => {
                      const meta = getActivityMeta(activity.action);
                      const author = activity.user?.displayName || activity.user?.name || 'System';

                      return (
                        <tr key={activity.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 text-slate-800 font-medium max-w-[280px] truncate">
                            {activity.action}
                          </td>
                          <td className="py-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${meta.badge}`}>
                              {meta.tag}
                            </span>
                          </td>
                          <td className="py-3 text-slate-600">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[9px] flex items-center justify-center">
                                {author.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[120px]">{author}</span>
                            </div>
                          </td>
                          <td className="py-3 text-right text-slate-400">
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

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {Math.min(6, filteredActivities.length)} of {activities.length} events</span>
            <Link to="/activity" className="font-semibold text-slate-800 hover:text-slate-950">
              Full activity log
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
