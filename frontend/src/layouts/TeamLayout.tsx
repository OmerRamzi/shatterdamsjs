import { Outlet } from 'react-router-dom';
import { PortalLayout } from '../components/layout/PortalLayout';
import { LayoutDashboard, FolderKanban } from "lucide-react";
import { useAuth } from '../context/AuthContext';

export default function TeamLayout() {
  const { user } = useAuth();
  if (!user) return null;

  const navItems = [
    { name: "Dashboard", to: "/team", icon: LayoutDashboard },
    { name: "Projects", to: "/team/projects", icon: FolderKanban },
  ];

  return (
    <PortalLayout 
      navItems={navItems}
      basePath="/team"
    >
      <Outlet />
    </PortalLayout>
  );
}
