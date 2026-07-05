import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { AdminTopbar } from '../components/layout/AdminTopbar';

export default function AdminLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200">
      <AdminTopbar />
      <div className="flex flex-1 min-h-0">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto p-8 bg-[#f4f5f5] text-slate-900 rounded-tl-xl shadow-[inset_0_4px_10px_rgba(0,0,0,0.05)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
