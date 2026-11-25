import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  MODULE_DEFINITIONS,
  type ModuleKey,
  type PermissionRowInput,
} from '../../lib/permissions';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  member?: any;
}

const INVITE_QUICK_MODULES: ModuleKey[] = [
  'crm',
  'invoices',
  'quotes',
  'clients',
  'projects',
  'tasks',
  'timesheets',
  'financials',
  'commissions',
  'reports',
];

export function TeamModal({ isOpen, onClose, onSaved, member }: TeamModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    phone: '',
    role: 'employee',
  });
  const [selectedModules, setSelectedModules] = useState<ModuleKey[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (member) {
      setFormData({
        email: member.email || '',
        displayName: member.displayName || '',
        phone: member.phone || '',
        role: member.role || 'employee',
      });
      setSelectedModules([]);
    } else {
      setFormData({
        email: '',
        displayName: '',
        phone: '',
        role: 'employee',
      });
      setSelectedModules([]);
    }
    setError('');
  }, [member, isOpen]);

  if (!isOpen) return null;

  const toggleQuickModule = (key: ModuleKey) => {
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const url = member ? `/api/team/${member.id}` : '/api/team';
      const method = member ? 'PUT' : 'POST';

      const initialPermissions: PermissionRowInput[] =
        !member && formData.role !== 'administrator'
          ? selectedModules.map((moduleKey) => ({
              moduleKey,
              accessLevel: 'manage',
              scope: 'all',
            }))
          : [];

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          member ? formData : { ...formData, permissions: initialPermissions }
        ),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save team member');

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-md rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold">
            {member ? 'Edit Team Member' : 'Invite Team Member'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
              {error}
            </div>
          )}

          <form id="teamForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name *</label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                required
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Email Address {member ? '' : '*'}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required={!member}
                disabled={!!member}
                className={`w-full border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  member
                    ? 'bg-secondary/30 text-muted-foreground cursor-not-allowed'
                    : 'bg-secondary/50'
                }`}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role *</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="administrator">Administrator</option>
                <option value="employee">Employee</option>
                <option value="freelancer">Freelancer</option>
              </select>
            </div>

            {!member && formData.role !== 'administrator' && (
              <div className="space-y-2 pt-1">
                <label className="text-sm font-medium">
                  Initial Module Access{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {INVITE_QUICK_MODULES.map((key) => {
                    const def = MODULE_DEFINITIONS.find((m) => m.key === key);
                    if (!def) return null;
                    const active = selectedModules.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleQuickModule(key)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-slate-900 text-yellow-400 border-slate-900'
                            : 'bg-secondary/40 text-muted-foreground border-border hover:bg-secondary'
                        }`}
                      >
                        {def.shortLabel}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Selected modules grant Manage access by default. Fine-tune levels
                  anytime via Manage Access.
                </p>
              </div>
            )}

            {!member && (
              <p className="text-xs text-muted-foreground">
                The user will be created with a default password of{' '}
                <strong>Team@123</strong>. They can change it upon logging in.
              </p>
            )}
          </form>
        </div>

        <div className="p-6 border-t border-border bg-secondary/10 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg font-medium hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="teamForm"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : member ? 'Save Changes' : 'Invite Member'}
          </button>
        </div>
      </div>
    </div>
  );
}
