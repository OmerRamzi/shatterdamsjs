import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminClientsPage from './pages/admin/Clients';
import AdminClientDetailsPage from './pages/admin/ClientDetails';
import AdminProjectsPage from './pages/admin/Projects';
import AdminTeamPage from './pages/admin/Team';
import AdminInvoicesPage from './pages/admin/Invoices';
import AdminNewInvoicePage from './pages/admin/NewInvoice';
import AdminEditInvoicePage from './pages/admin/EditInvoice';
import AdminInvoiceDetailsPage from './pages/admin/InvoiceDetails';
import AdminQuotesPage from './pages/admin/Quotes';
import AdminNewQuotePage from './pages/admin/NewQuote';
import AdminEditQuotePage from './pages/admin/EditQuote';
import AdminQuoteDetailsPage from './pages/admin/QuoteDetails';
import AdminProjectDetailsPage from './pages/admin/ProjectDetails';
import AdminUsersPage from './pages/admin/Users';
import AdminTimesheetsPage from './pages/admin/Timesheets';
import AdminTasksPage from './pages/admin/Tasks';
import AdminReportsPage from './pages/admin/Reports';
import AdminSettingsPage from './pages/admin/Settings';
import ClientDashboardPage from './pages/client/Dashboard';
import ClientProjectsPage from './pages/client/Projects';
import ClientProjectDetailsPage from './pages/client/ProjectDetails';
import ClientInvoicesPage from './pages/client/Invoices';
import ClientInvoiceDetailsPage from './pages/client/InvoiceDetails';
import ClientQuotesPage from './pages/client/Quotes';
import ClientQuoteDetailsPage from './pages/client/QuoteDetails';
import TeamDashboardPage from './pages/team/Dashboard';
import TeamProjectsPage from './pages/team/Projects';
import TeamProjectDetailsPage from './pages/team/ProjectDetails';
import AdminLayout from './layouts/AdminLayout';
import ClientLayout from './layouts/ClientLayout';
import TeamLayout from './layouts/TeamLayout';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect based on role to correct subdomain
    let newSubdomain = 'team';
    if (user.role === 'administrator') newSubdomain = 'admin';
    if (user.role === 'client') newSubdomain = 'client';
    
    const hostname = window.location.hostname;
    if (hostname.includes('.')) {
      const parts = hostname.split('.');
      parts[0] = newSubdomain;
      window.location.hostname = parts.join('.');
    } else {
      window.location.hostname = newSubdomain + '.localhost';
    }
    return <div className="flex h-screen items-center justify-center">Redirecting to your portal...</div>;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const hostname = window.location.hostname;
  
  let portal = 'team'; // default
  if (hostname.startsWith('admin.')) portal = 'admin';
  else if (hostname.startsWith('client.')) portal = 'client';

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {portal === 'admin' && (
        <Route path="/" element={
          <ProtectedRoute allowedRoles={['administrator']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="clients" element={<AdminClientsPage />} />
          <Route path="clients/:id" element={<AdminClientDetailsPage />} />
          <Route path="projects" element={<AdminProjectsPage />} />
          <Route path="projects/:id" element={<AdminProjectDetailsPage />} />
          <Route path="team" element={<AdminTeamPage />} />
          <Route path="invoices" element={<AdminInvoicesPage />} />
          <Route path="invoices/new" element={<AdminNewInvoicePage />} />
          <Route path="invoices/:id/edit" element={<AdminEditInvoicePage />} />
          <Route path="invoices/:id" element={<AdminInvoiceDetailsPage />} />
          <Route path="quotes" element={<AdminQuotesPage />} />
          <Route path="quotes/new" element={<AdminNewQuotePage />} />
          <Route path="quotes/:id/edit" element={<AdminEditQuotePage />} />
          <Route path="quotes/:id" element={<AdminQuoteDetailsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="timesheets" element={<AdminTimesheetsPage />} />
          <Route path="tasks" element={<AdminTasksPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      )}

      {portal === 'team' && (
        <Route path="/" element={
          <ProtectedRoute allowedRoles={['employee', 'freelancer', 'administrator']}>
            <TeamLayout />
          </ProtectedRoute>
        }>
          <Route index element={<TeamDashboardPage />} />
          <Route path="dashboard" element={<TeamDashboardPage />} />
          <Route path="projects" element={<TeamProjectsPage />} />
          <Route path="projects/:id" element={<TeamProjectDetailsPage />} />
        </Route>
      )}

      {portal === 'client' && (
        <Route path="/" element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientLayout />
          </ProtectedRoute>
        }>
          <Route index element={<ClientDashboardPage />} />
          <Route path="dashboard" element={<ClientDashboardPage />} />
          <Route path="projects" element={<ClientProjectsPage />} />
          <Route path="projects/:id" element={<ClientProjectDetailsPage />} />
          <Route path="invoices" element={<ClientInvoicesPage />} />
          <Route path="invoices/:id" element={<ClientInvoiceDetailsPage />} />
          <Route path="quotes" element={<ClientQuotesPage />} />
          <Route path="quotes/:id" element={<ClientQuoteDetailsPage />} />
        </Route>
      )}
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
