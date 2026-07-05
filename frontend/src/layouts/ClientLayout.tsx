import { Outlet } from 'react-router-dom';
import { ClientSidebar } from '../components/layout/ClientSidebar';
import { useAuth } from '../context/AuthContext';

export default function ClientLayout() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-900">
      <ClientSidebar />
      <main className="flex-1 overflow-y-auto bg-white">
        <Outlet />
      </main>
    </div>
  );
}
