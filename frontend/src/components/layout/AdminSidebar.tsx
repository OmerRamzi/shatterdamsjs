import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  ShieldAlert, 
  Receipt, 
  FileText, 
  Clock, 
  CheckSquare, 
  BarChart3, 
  UserCog, 
  Settings, 
  LogOut, 
  DollarSign, 
  Link2,
  X,
  ChevronRight,
  Target,
  UserPlus,
  BookUser,
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  name: string;
  to: string;
  icon: any;
  badge?: string;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    groupTitle: 'Operations',
    items: [
      { name: 'Overview', to: '/', icon: LayoutDashboard },
      { name: 'Projects', to: '/projects', icon: FolderKanban },
      { name: 'Tasks', to: '/tasks', icon: CheckSquare },
      { name: 'Timesheets', to: '/timesheets', icon: Clock },
    ],
  },
  {
    groupTitle: 'CRM & Sales',
    items: [
      { name: 'Deals & Pipeline', to: '/crm', icon: Target },
      { name: 'Leads', to: '/crm/leads', icon: UserPlus },
      { name: 'Contacts', to: '/crm/contacts', icon: BookUser },
      { name: 'Clients', to: '/clients', icon: Building2 },
    ],
  },
  {
    groupTitle: 'Financials & Billing',
    items: [
      { name: 'Financials', to: '/financials', icon: DollarSign },
      { name: 'Invoices', to: '/invoices', icon: Receipt },
      { name: 'Quotations', to: '/quotes', icon: FileText },
      { name: 'Commissions', to: '/commissions', icon: Link2 },
      { name: 'Reports', to: '/reports', icon: BarChart3 },
    ],
  },
  {
    groupTitle: 'Administration',
    items: [
      { name: 'Team', to: '/team', icon: ShieldAlert },
      { name: 'Manage Users', to: '/users', icon: UserCog },
      { name: 'Settings', to: '/settings', icon: Settings },
    ],
  },
];

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AdminSidebar({ mobileOpen = false, onCloseMobile }: AdminSidebarProps) {
  const location = useLocation();
  const { logout } = useAuth();

  const renderNavContent = () => (
    <div className="flex flex-col h-full bg-[#101216] text-slate-300 select-none border-r border-white/10">
      {/* Mobile Header if inside Drawer */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-2">
          <img src="/brand/logo-yellow.png" alt="Shatter" className="h-6 w-auto object-contain" />
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Grouped Nav Items List */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-thin">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1.5">
            <div className="px-3 text-xs font-semibold text-slate-400">
              {group.groupTitle}
            </div>
            
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname === item.to || location.pathname.startsWith(item.to + '/');

                return (
                  <Link
                    key={item.name}
                    to={item.to}
                    onClick={() => onCloseMobile && onCloseMobile()}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 ${
                      isActive 
                        ? 'bg-yellow-400/10 text-yellow-300 font-semibold shadow-xs ring-1 ring-yellow-400/20' 
                        : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-yellow-400' : 'text-slate-400 group-hover:text-slate-200'
                      }`} />
                      <span>{item.name}</span>
                    </div>
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      
      {/* Sign Out Footer */}
      <div className="p-3 border-t border-white/10 bg-black/20">
        <button 
          onClick={logout} 
          className="flex w-full items-center justify-between px-3 py-2 text-xs sm:text-sm font-medium rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-400" />
            <span>Sign out</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-rose-400" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="w-64 border-r border-slate-200/80 hidden lg:flex flex-col h-full shadow-[2px_0_8px_rgba(0,0,0,0.02)] z-10 shrink-0">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Backdrop & Panel */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          {/* Drawer Slide-in Panel */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderNavContent()}
          </div>
        </div>
      )}
    </>
  );
}
