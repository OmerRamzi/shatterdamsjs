import { db } from "@/db";
import { users, userRoles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { Search, ShieldAlert, Users } from "lucide-react";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session || !session.user) return null;

  // Fetch all users
  const allUsers = await db.select().from(users).where(eq(users.tenantId, session.user.tenantId));
  const roles = await db.select().from(userRoles);

  const usersWithRoles = allUsers.map(u => ({
    ...u,
    role: roles.find(r => r.userId === u.id)?.role || "unknown"
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Users</h2>
          <p className="text-muted-foreground mt-1">Global view of all authenticated users across the tenant.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              className="w-full bg-secondary/50 border-none rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">System ID</th>
                <th className="px-6 py-4 font-medium">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usersWithRoles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="w-8 h-8 mb-2 opacity-50" />
                      <p>No users found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                usersWithRoles.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.displayName.charAt(0)}
                        </div>
                        <div>
                          <p>{user.displayName}</p>
                          <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === 'administrator' 
                          ? 'bg-amber-500/10 text-amber-500'
                          : user.role === 'client'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-muted-foreground text-xs">
                      USR-{user.id.toString().padStart(4, '0')}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {user.createdAt ? user.createdAt.toLocaleDateString() : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
