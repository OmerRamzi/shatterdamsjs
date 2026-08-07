import { Outlet } from 'react-router-dom';
import { PortalLayout } from '../components/layout/PortalLayout';
import { LayoutDashboard, FolderKanban, Clock } from "lucide-react";
import { useAuth } from '../context/AuthContext';

export default function TeamLayout() {
  const { user } = useAuth();
  if (!user) return null;

  const navItems = [
    { name: "Dashboard", to: "/", icon: LayoutDashboard },
    { name: "Projects", to: "/projects", icon: FolderKanban },
    { name: "Timesheets", to: "/timesheets", icon: Clock },
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
