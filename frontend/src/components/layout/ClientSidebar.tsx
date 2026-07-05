import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Home, Folder, Receipt, Globe, LogOut } from 'lucide-react';

export function ClientSidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const navItems = [
    { name: "Home page", to: "/", icon: Home },
    { name: "My Projects", to: "/projects", icon: Folder },
    { name: "Invoices & Quotes", to: "/invoices", icon: Receipt },
  ];

  return (
    <div className="w-[280px] bg-white border-r border-slate-200 flex flex-col h-full shadow-sm">
      <div className="px-8 py-10 flex justify-center">
        <img src="/brand/icon-yellow.png" alt="SHATTER" className="h-10 object-contain" />
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || 
                           (item.to !== '/' && location.pathname.startsWith(item.to));
          
          return (
            <Link
              key={item.name}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 ${
                isActive 
                  ? 'bg-[#18181b] text-yellow-400' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-6 space-y-4">
        {/* Language Selector */}
        <div className="flex items-center justify-between px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white shadow-sm cursor-pointer hover:bg-slate-50">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-500" />
            English
          </div>
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* User Block */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-slate-900 font-bold text-lg">
            {user?.name ? user.name[0].toUpperCase() : 'C'}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">{user?.name || 'Client'}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">CLIENT PORTAL</p>
          </div>
        </div>

        {/* Sign Out */}
        <button 
          onClick={logout} 
          className="w-full flex items-center justify-center gap-2 bg-[#18181b] hover:bg-black transition-colors text-yellow-400 px-4 py-3 rounded-2xl text-sm font-bold shadow-md"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
