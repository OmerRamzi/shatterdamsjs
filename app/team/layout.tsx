import { PortalLayout } from "@/components/layout/PortalLayout";
import { LayoutDashboard, FolderGit2 } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || !session.user) redirect("/login");

  const menuItems = [
    { label: "Dashboard", href: "/team/dashboard", icon: LayoutDashboard },
    { label: "My Projects", href: "/team/projects", icon: FolderGit2 },
  ];

  return (
    <PortalLayout 
      portalName="Shatter Team"
      menuItems={menuItems}
      userName={session.user.name || "User"}
      userRole={session.user.role || "team"}
    >
      {children}
    </PortalLayout>
  );
}
