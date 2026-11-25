import { useState, useEffect } from 'react';
import { X, CheckSquare, UserCheck, Briefcase, Building2 } from 'lucide-react';

interface BulkEditContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedIds: number[];
  teamMembers: any[];
}

export function BulkEditContactsModal({
  isOpen,
  onClose,
  onSuccess,
  selectedIds,
  teamMembers,
}: BulkEditContactsModalProps) {
  const [clients, setClients] = useState<any[]>([]);

  const [updateAssignedTo, setUpdateAssignedTo] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');

  const [updateRole, setUpdateRole] = useState(false);
  const [role, setRole] = useState('decision_maker');

  const [updateClient, setUpdateClient] = useState(false);
  const [clientId, setClientId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/clients')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setClients(data);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || selectedIds.length === 0) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const updates: Record<string, any> = {};

    if (updateAssignedTo) {
      updates.assignedTo = assignedTo ? parseInt(assignedTo) : null;
    }
    if (updateRole) {
      updates.role = role;
    }
    if (updateClient) {
      updates.clientId = clientId ? parseInt(clientId) : null;
    }

    if (Object.keys(updates).length === 0) {
      setError('Please check at least one property to bulk update.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/crm/contacts/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          updates,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to bulk update contacts');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error occurred during bulk update');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-yellow-400/10 text-yellow-700 flex items-center justify-center ring-1 ring-yellow-400/20">
              <CheckSquare className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 font-heading">
                Bulk Update Contacts
              </h3>
              <p className="text-xs text-slate-500">
                Updating {selectedIds.length} selected {selectedIds.length === 1 ? 'contact' : 'contacts'} simultaneously
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <p className="text-xs text-slate-500">
            Check the fields you wish to change. Unchecked fields will remain unchanged on all selected contacts.
          </p>

          {/* Assigned Team Member */}
          <div className={`p-3.5 rounded-xl border transition-colors ${updateAssignedTo ? 'bg-yellow-50/50 border-yellow-300 ring-1 ring-yellow-400/30' : 'bg-slate-50/70 border-slate-200/80'}`}>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-2">
              <input
                type="checkbox"
                checked={updateAssignedTo}
                onChange={(e) => setUpdateAssignedTo(e.target.checked)}
                className="w-4 h-4 text-yellow-500 rounded border-slate-300 focus:ring-yellow-400"
              />
              <UserCheck className="w-4 h-4 text-slate-500" />
              <span>Update Assigned Team Member</span>
            </label>

            {updateAssignedTo && (
              <div className="pl-6 pt-1">
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-900 bg-white text-xs sm:text-sm font-medium"
                >
                  <option value="">— Unassign (Clear Assignee) —</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName || m.name || m.email} {m.role ? `(${m.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Role */}
          <div className={`p-3.5 rounded-xl border transition-colors ${updateRole ? 'bg-yellow-50/50 border-yellow-300 ring-1 ring-yellow-400/30' : 'bg-slate-50/70 border-slate-200/80'}`}>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-2">
              <input
                type="checkbox"
                checked={updateRole}
                onChange={(e) => setUpdateRole(e.target.checked)}
                className="w-4 h-4 text-yellow-500 rounded border-slate-300 focus:ring-yellow-400"
              />
              <Briefcase className="w-4 h-4 text-slate-500" />
              <span>Update Contact Role</span>
            </label>

            {updateRole && (
              <div className="pl-6 pt-1">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-900 bg-white text-xs sm:text-sm font-medium"
                >
                  <option value="decision_maker">Decision Maker</option>
                  <option value="primary">Primary Point of Contact</option>
                  <option value="influencer">Influencer</option>
                  <option value="billing">Billing / Accounts</option>
                  <option value="technical">Technical / Creative Lead</option>
                  <option value="other">Other</option>
                </select>
              </div>
            )}
          </div>

          {/* Associated Client Company */}
          <div className={`p-3.5 rounded-xl border transition-colors ${updateClient ? 'bg-yellow-50/50 border-yellow-300 ring-1 ring-yellow-400/30' : 'bg-slate-50/70 border-slate-200/80'}`}>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-2">
              <input
                type="checkbox"
                checked={updateClient}
                onChange={(e) => setUpdateClient(e.target.checked)}
                className="w-4 h-4 text-yellow-500 rounded border-slate-300 focus:ring-yellow-400"
              />
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>Update Associated Client Company</span>
            </label>

            {updateClient && (
              <div className="pl-6 pt-1">
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-900 bg-white text-xs sm:text-sm font-medium"
                >
                  <option value="">— Standalone / Disassociate from Client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-colors text-xs sm:text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!updateAssignedTo && !updateRole && !updateClient)}
              className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold transition-all shadow-xs text-xs sm:text-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : `Apply to ${selectedIds.length} Contacts`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
