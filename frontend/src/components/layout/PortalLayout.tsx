import { useState } from 'react';
import type { ReactNode } from 'react';
import { Menu, X, Bell, Search, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

interface PortalLayoutProps {
  children: ReactNode;
  navItems: { name: string; to: string; icon: React.ElementType }[];
  basePath: string;
}

export function PortalLayout({ children, navItems, basePath }: PortalLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex h-screen bg-[#F8F9FB]">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-60 bg-[#101216] text-slate-300 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 border-r border-white/10 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2">
            <img src="/brand/logo-yellow.png" alt="Shatter DAMS" className="h-6 object-contain" />
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 px-3 flex-1">
          <div className="px-3 text-xs font-semibold text-slate-400 mb-2">
            Workspace
          </div>
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to || 
                               (item.to !== basePath && location.pathname.startsWith(item.to));
              
              return (
                <Link
                  key={item.name}
                  to={item.to}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150
                    ${isActive 
                      ? 'bg-yellow-400/10 text-yellow-300 font-semibold ring-1 ring-yellow-400/20' 
                      : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100'
                    }
                  `}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-yellow-400' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-white/10 bg-black/20">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="relative w-full max-w-sm hidden sm:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects, tasks..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-shadow"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button className="relative p-2 text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
              <Bell className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="w-7 h-7 rounded-md bg-yellow-400 text-slate-950 flex items-center justify-center font-bold text-xs uppercase">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">{user?.name || 'User'}</p>
                <p className="text-[10px] text-slate-500 capitalize">{user?.role || 'team'}</p>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
