import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
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
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { name: 'Overview', to: '/', icon: LayoutDashboard },
  { name: 'Projects', to: '/projects', icon: FolderKanban },
  { name: 'Clients', to: '/clients', icon: Users },
  { name: 'Team', to: '/team', icon: ShieldAlert },
  { name: 'Timesheets', to: '/timesheets', icon: Clock },
  { name: 'Financials', to: '/financials', icon: DollarSign },
  { name: 'Commissions', to: '/commissions', icon: Link2 },
  { name: 'Invoices', to: '/invoices', icon: Receipt },
  { name: 'Quotations', to: '/quotes', icon: FileText },
  { name: 'Tasks', to: '/tasks', icon: CheckSquare },
  { name: 'Reports', to: '/reports', icon: BarChart3 },
  { name: 'Manage Users', to: '/users', icon: UserCog },
  { name: 'Settings', to: '/settings', icon: Settings },
];

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AdminSidebar({ mobileOpen = false, onCloseMobile }: AdminSidebarProps) {
  const location = useLocation();
  const { logout } = useAuth();

  const renderNavContent = () => (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Mobile Header if inside Drawer */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black italic tracking-tighter text-amber-500">SHATTER</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Navigation</span>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Items List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || 
                           (item.to !== '/' && location.pathname.startsWith(item.to));
          
          return (
            <Link
              key={item.name}
              to={item.to}
              onClick={() => onCloseMobile && onCloseMobile()}
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                isActive 
                  ? 'bg-amber-400/15 text-amber-900 shadow-xs ring-1 ring-amber-400/30' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-4 h-4 transition-colors ${
                  isActive ? 'text-amber-600' : 'text-slate-400 group-hover:text-slate-700'
                }`} />
                <span>{item.name}</span>
              </div>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </Link>
          );
        })}
      </nav>
      
      {/* Sign Out Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <button 
          onClick={logout} 
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-500" />
            <span>Sign Out</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-rose-500" />
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
