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
  BarChart,
  UserCog,
  Settings,
  LogOut,
  DollarSign,
  Link2
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
  { name: 'Reports', to: '/reports', icon: BarChart },
  { name: 'Manage Users', to: '/users', icon: UserCog },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export function AdminSidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  
  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex h-full shadow-sm">
      <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || 
                           (item.to !== '/' && location.pathname.startsWith(item.to));
          
          return (
            <Link
              key={item.name}
              to={item.to}
              className={`flex items-center gap-3 px-6 py-3 text-sm font-semibold transition-all duration-200 border-l-4 ${
                isActive 
                  ? 'border-yellow-400 text-yellow-500 bg-yellow-50/50' 
                  : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-200">
        <button 
          onClick={logout} 
          className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
