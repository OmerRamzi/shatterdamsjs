import { PortalLayout } from "@/components/layout/PortalLayout";
import { LayoutDashboard, FolderGit2, Receipt, FileText } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || !session.user) redirect("/login");

  const menuItems = [
    { label: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard },
    { label: "My Projects", href: "/client/projects", icon: FolderGit2 },
    { label: "Quotations", href: "/client/quotes", icon: FileText },
    { label: "Invoices", href: "/client/invoices", icon: Receipt },
  ];

  return (
    <PortalLayout 
      portalName="Client Portal"
      menuItems={menuItems}
      userName={session.user.name || "Client"}
      userRole="Client"
    >
      {children}
    </PortalLayout>
  );
}

