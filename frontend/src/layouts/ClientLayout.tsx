import { Outlet } from 'react-router-dom';
import { PortalLayout } from '../components/layout/PortalLayout';
import { LayoutDashboard, FolderKanban, Receipt, FileText } from "lucide-react";
import { useAuth } from '../context/AuthContext';

export default function ClientLayout() {
  const { user } = useAuth();
  if (!user) return null;

  const navItems = [
    { name: "Dashboard", to: "/", icon: LayoutDashboard },
    { name: "Projects", to: "/projects", icon: FolderKanban },
    { name: "Quotations", to: "/quotes", icon: FileText },
    { name: "Invoices", to: "/invoices", icon: Receipt },
  ];

  return (
    <PortalLayout 
      navItems={navItems}
      basePath="/"
    >
      <Outlet />
    </PortalLayout>
  );
}
