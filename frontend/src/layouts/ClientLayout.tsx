import { Outlet } from 'react-router-dom';
import { ClientSidebar } from '../components/layout/ClientSidebar';
import { useAuth } from '../context/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function ClientLayout() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#101216] text-slate-900">
      <ClientSidebar />
      <main className="flex-1 overflow-y-auto bg-[#F8F9FB] p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
