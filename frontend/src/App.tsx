import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminClientsPage from './pages/admin/Clients';
import AdminProjectsPage from './pages/admin/Projects';
import AdminTeamPage from './pages/admin/Team';
import AdminInvoicesPage from './pages/admin/Invoices';
import AdminNewInvoicePage from './pages/admin/NewInvoice';
import AdminInvoiceDetailsPage from './pages/admin/InvoiceDetails';
import AdminQuotesPage from './pages/admin/Quotes';
import AdminNewQuotePage from './pages/admin/NewQuote';
import AdminQuoteDetailsPage from './pages/admin/QuoteDetails';
import AdminProjectDetailsPage from './pages/admin/ProjectDetails';
import AdminUsersPage from './pages/admin/Users';
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
    // Redirect based on role if they try to access something they shouldn't
    if (user.role === 'administrator') return <Navigate to="/admin" replace />;
    if (user.role === 'client') return <Navigate to="/client" replace />;
    return <Navigate to="/team" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['administrator']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="clients" element={<AdminClientsPage />} />
        <Route path="projects" element={<AdminProjectsPage />} />
        <Route path="projects/:id" element={<AdminProjectDetailsPage />} />
        <Route path="team" element={<AdminTeamPage />} />
        <Route path="invoices" element={<AdminInvoicesPage />} />
        <Route path="invoices/new" element={<AdminNewInvoicePage />} />
        <Route path="invoices/:id" element={<AdminInvoiceDetailsPage />} />
        <Route path="quotes" element={<AdminQuotesPage />} />
        <Route path="quotes/new" element={<AdminNewQuotePage />} />
        <Route path="quotes/:id" element={<AdminQuoteDetailsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
      </Route>

      {/* Team Routes */}
      <Route path="/team" element={
        <ProtectedRoute allowedRoles={['employee', 'freelancer', 'administrator']}>
          <TeamLayout />
        </ProtectedRoute>
      }>
        <Route index element={<TeamDashboardPage />} />
        <Route path="dashboard" element={<TeamDashboardPage />} />
        <Route path="projects" element={<TeamProjectsPage />} />
        <Route path="projects/:id" element={<TeamProjectDetailsPage />} />
      </Route>

      {/* Client Routes */}
      <Route path="/client" element={
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
