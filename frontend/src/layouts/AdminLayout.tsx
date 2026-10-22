import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { AdminTopbar } from '../components/layout/AdminTopbar';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 antialiased selection:bg-amber-400 selection:text-slate-950">
      <AdminTopbar 
        onMenuToggle={() => setMobileMenuOpen(prev => !prev)} 
        isMenuOpen={mobileMenuOpen} 
      />
      <div className="flex flex-1 min-h-0 relative">
        <AdminSidebar 
          mobileOpen={mobileMenuOpen} 
          onCloseMobile={() => setMobileMenuOpen(false)} 
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F2F4F7] text-slate-900 rounded-tl-2xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] transition-all">
          <div className="max-w-7xl mx-auto">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
