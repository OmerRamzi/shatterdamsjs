import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, FolderGit2, Receipt, LogOut } from 'lucide-react';

export function ClientSidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const navItems = [
    { name: "Overview", to: "/", icon: LayoutDashboard },
    { name: "Projects", to: "/projects", icon: FolderGit2 },
    { name: "Invoices & Quotes", to: "/invoices", icon: Receipt },
  ];

  return (
    <aside className="w-60 bg-[#101216] text-slate-300 border-r border-white/10 flex flex-col h-full shrink-0 select-none">
      <div className="h-14 px-4 flex items-center border-b border-white/10">
        <Link to="/" className="flex items-center gap-2">
          <img src="/brand/logo-yellow.png" alt="Shatter DAMS" className="h-6 object-contain" />
        </Link>
      </div>
      
      <div className="py-4 px-3 flex-1">
        <div className="px-3 text-xs font-semibold text-slate-400 mb-2">
          Client Portal
        </div>
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || 
                             (item.to !== '/' && location.pathname.startsWith(item.to));
            
            return (
              <Link
                key={item.name}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 ${
                  isActive 
                    ? 'bg-yellow-400/10 text-yellow-300 font-semibold ring-1 ring-yellow-400/20' 
                    : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100'
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? 'text-yellow-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="p-3 border-t border-white/10 bg-black/20 space-y-2">
        {/* User Block */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white/[0.03]">
          <div className="w-7 h-7 rounded-md bg-yellow-400 text-slate-950 flex items-center justify-center font-bold text-xs uppercase">
            {user?.name ? user.name[0] : 'C'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'Client'}</p>
            <p className="text-[10px] text-slate-400">Client Access</p>
          </div>
        </div>

        {/* Sign Out */}
        <button 
          onClick={logout} 
          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
