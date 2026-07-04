import { Outlet } from 'react-router-dom';
import { PortalLayout } from '../components/layout/PortalLayout';
import { LayoutDashboard, FolderKanban, Receipt, FileText } from "lucide-react";
import { useAuth } from '../context/AuthContext';

export default function ClientLayout() {
  const { user } = useAuth();
  if (!user) return null;

  const navItems = [
    { name: "Dashboard", to: "/client", icon: LayoutDashboard },
    { name: "Projects", to: "/client/projects", icon: FolderKanban },
    { name: "Quotations", to: "/client/quotes", icon: FileText },
    { name: "Invoices", to: "/client/invoices", icon: Receipt },
  ];

  return (
    <PortalLayout 
      navItems={navItems}
      basePath="/client"
    >
      <Outlet />
    </PortalLayout>
  );
}
