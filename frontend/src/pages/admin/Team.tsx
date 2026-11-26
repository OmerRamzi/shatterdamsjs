import { useState, useEffect } from 'react';
import { Plus, Search, User, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { TeamModal } from '../../components/admin/TeamModal';
import { TeamPermissionsModal } from '../../components/admin/TeamPermissionsModal';
import { getModuleLabel, type PermissionRowInput } from '../../lib/permissions';

export default function AdminTeamPage() {
  const [team, setTeam] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Permissions modal state
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [permMember, setPermMember] = useState<any>(null);

  const fetchTeam = (silent = false) => {
    if (!silent) setIsLoading(true);
    fetch('/api/team', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTeam(data);
      })
      .finally(() => {
        if (!silent) setIsLoading(false);
      });
  };

  const handlePermissionsSaved = (
    updatedPermissions?: PermissionRowInput[],
    targetUserId?: number
  ) => {
    if (targetUserId !== undefined && Array.isArray(updatedPermissions)) {
      setTeam((prev) =>
        prev.map((m) =>
          m.id === targetUserId ? { ...m, permissions: updatedPermissions } : m
        )
      );
      setPermMember((prev: any) =>
        prev && prev.id === targetUserId
          ? { ...prev, permissions: updatedPermissions }
          : prev
      );
    }
    fetchTeam(true);
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleAdd = () => {
    setSelectedMember(null);
    setIsModalOpen(true);
  };

  const handleEdit = (member: any) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleManageAccess = (member: any) => {
    setPermMember(member);
    setIsPermModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTeam();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove team member');
      }
    } catch {
      alert('Error removing team member');
    }
  };

  const filteredTeam = team.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.displayName?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Team</h2>
          <p className="text-muted-foreground mt-1">
            Manage your internal staff, freelancers, and their system module access.
          </p>
        </div>
        <button onClick={handleAdd} className="btn-primary gap-2">
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team..."
              className="w-full bg-secondary/50 border-none rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Module Access</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Last Login</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Loading team...
                  </td>
                </tr>
              ) : filteredTeam.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <User className="w-8 h-8 mb-2 opacity-50" />
                      <p>No team members found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTeam.map((member) => {
                  const perms = Array.isArray(member.permissions)
                    ? member.permissions
                    : [];
                  const isAdmin = member.role === 'administrator';

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-secondary/20 transition-colors group"
                    >
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {member.displayName.charAt(0)}
                          </div>
                          <div>
                            <p>{member.displayName}</p>
                            <p className="text-xs text-muted-foreground font-normal">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground capitalize">
                        {member.role}
                      </td>
                      <td className="px-6 py-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-400/15 text-amber-700 border border-yellow-400/30">
                            All Modules (Admin)
                          </span>
                        ) : perms.length === 0 ? (
                          <button
                            onClick={() => handleManageAccess(member)}
                            className="text-xs text-muted-foreground hover:text-slate-900 underline decoration-dotted"
                          >
                            Baseline only • Grant modules
                          </button>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1 max-w-xs">
                            {perms.slice(0, 3).map((p: any) => (
                              <span
                                key={p.moduleKey}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200"
                                title={`${getModuleLabel(p.moduleKey)} (${p.accessLevel}${
                                  p.scope === 'assigned' ? ' • assigned only' : ''
                                })`}
                              >
                                {getModuleLabel(p.moduleKey)}
                                <span className="text-[10px] text-slate-500 capitalize">
                                  · {p.accessLevel}
                                </span>
                              </span>
                            ))}
                            {perms.length > 3 && (
                              <span className="text-[11px] text-muted-foreground font-medium px-1">
                                +{perms.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            member.isActive !== false
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {member.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {member.lastLoginAt
                          ? new Date(member.lastLoginAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isAdmin && (
                            <button
                              onClick={() => handleManageAccess(member)}
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-yellow-400/20 text-slate-700 hover:text-slate-900 transition-colors"
                              title="Manage Module Access"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                              <span className="hidden xl:inline">Access</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(member)}
                            className="text-muted-foreground hover:text-primary p-1.5 rounded hover:bg-secondary transition-colors"
                            title="Edit Member"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="text-muted-foreground hover:text-destructive p-1.5 rounded hover:bg-destructive/10 transition-colors"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TeamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchTeam}
        member={selectedMember}
      />

      <TeamPermissionsModal
        isOpen={isPermModalOpen}
        onClose={() => setIsPermModalOpen(false)}
        onSaved={handlePermissionsSaved}
        member={permMember}
      />
    </div>
  );
}
