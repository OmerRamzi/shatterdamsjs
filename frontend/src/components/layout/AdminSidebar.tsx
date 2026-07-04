import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  ShieldAlert, 
  Receipt,
  FileText,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { name: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { name: 'Clients', to: '/admin/clients', icon: Users },
  { name: 'Projects', to: '/admin/projects', icon: FolderKanban },
  { name: 'Invoices', to: '/admin/invoices', icon: Receipt },
  { name: 'Quotes', to: '/admin/quotes', icon: FileText },
  { name: 'Team', to: '/admin/team', icon: ShieldAlert },
];

export function AdminSidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex h-full">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">SD</span>
          </div>
          Shatter DAMS
        </h1>
        <p className="text-xs text-slate-400 mt-2 font-medium bg-slate-800/50 py-1 px-2 rounded-md inline-block">
          Admin Portal
        </p>
      </div>
      
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || 
                           (item.to !== '/admin' && location.pathname.startsWith(item.to));
          
          return (
            <Link
              key={item.name}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600/10 text-blue-400' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={logout} 
          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
