import { useState, useEffect } from 'react';
import { Search, Users as UsersIcon, ShieldCheck } from 'lucide-react';
import { TeamPermissionsModal } from '../../components/admin/TeamPermissionsModal';
import { getModuleLabel, type PermissionRowInput } from '../../lib/permissions';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [permMember, setPermMember] = useState<any>(null);

  const fetchUsers = (silent = false) => {
    if (!silent) setIsLoading(true);
    fetch('/api/users', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUsers(data);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!silent) setIsLoading(false);
      });
  };

  const handlePermissionsSaved = (
    updatedPermissions?: PermissionRowInput[],
    targetUserId?: number
  ) => {
    if (targetUserId !== undefined && Array.isArray(updatedPermissions)) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUserId ? { ...u, permissions: updatedPermissions } : u
        )
      );
      setPermMember((prev: any) =>
        prev && prev.id === targetUserId
          ? { ...prev, permissions: updatedPermissions }
          : prev
      );
    }
    fetchUsers(true);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.displayName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Users & Permissions</h2>
          <p className="text-muted-foreground mt-1">
            Global view of all authenticated users across the tenant and their module access.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                <th className="px-6 py-4 font-medium">Module Access</th>
                <th className="px-6 py-4 font-medium">System ID</th>
                <th className="px-6 py-4 font-medium">Joined Date</th>
                <th className="px-6 py-4 text-right font-medium">Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <UsersIcon className="w-8 h-8 mb-2 opacity-50" />
                      <p>No users found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isStaff =
                    user.role === 'employee' || user.role === 'freelancer';
                  const perms = Array.isArray(user.permissions)
                    ? user.permissions
                    : [];

                  return (
                    <tr key={user.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase">
                            {user.displayName.charAt(0)}
                          </div>
                          <div>
                            <p>{user.displayName}</p>
                            <p className="text-xs text-muted-foreground font-normal">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.role === 'administrator'
                              ? 'bg-amber-500/10 text-amber-500'
                              : user.role === 'client'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-blue-500/10 text-blue-500'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.role === 'administrator' ? (
                          <span className="text-xs text-amber-600 font-medium">
                            Full System
                          </span>
                        ) : user.role === 'client' ? (
                          <span className="text-xs text-muted-foreground">
                            Client Portal Only
                          </span>
                        ) : perms.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            Baseline Team
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {perms.slice(0, 3).map((p: any) => (
                              <span
                                key={p.moduleKey}
                                className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200"
                              >
                                {getModuleLabel(p.moduleKey)}
                              </span>
                            ))}
                            {perms.length > 3 && (
                              <span className="text-[11px] text-muted-foreground">
                                +{perms.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-muted-foreground text-xs">
                        USR-{user.id.toString().padStart(4, '0')}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isStaff ? (
                          <button
                            onClick={() => {
                              setPermMember(user);
                              setIsPermModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-yellow-400/20 text-slate-700 hover:text-slate-900 transition-colors"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                            <span>Configure</span>
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TeamPermissionsModal
        isOpen={isPermModalOpen}
        onClose={() => setIsPermModalOpen(false)}
        onSaved={handlePermissionsSaved}
        member={permMember}
      />
    </div>
  );
}
