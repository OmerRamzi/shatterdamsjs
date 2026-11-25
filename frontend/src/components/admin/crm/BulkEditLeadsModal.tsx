import { useState } from 'react';
import { X, CheckSquare, Sparkles, UserCheck, Tag, Flag } from 'lucide-react';

interface BulkEditLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedIds: number[];
  teamMembers: any[];
}

export function BulkEditLeadsModal({
  isOpen,
  onClose,
  onSuccess,
  selectedIds,
  teamMembers,
}: BulkEditLeadsModalProps) {
  // Field values and whether each field is enabled for updating
  const [updateAssignedTo, setUpdateAssignedTo] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');

  const [updateStatus, setUpdateStatus] = useState(false);
  const [status, setStatus] = useState('new');

  const [updatePriority, setUpdatePriority] = useState(false);
  const [priority, setPriority] = useState('medium');

  const [updateSource, setUpdateSource] = useState(false);
  const [source, setSource] = useState('website');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || selectedIds.length === 0) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const updates: Record<string, any> = {};

    if (updateAssignedTo) {
      updates.assignedTo = assignedTo ? parseInt(assignedTo) : null;
    }
    if (updateStatus) {
      updates.status = status;
    }
    if (updatePriority) {
      updates.priority = priority;
    }
    if (updateSource) {
      updates.source = source;
    }

    if (Object.keys(updates).length === 0) {
      setError('Please check at least one property to bulk update.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/crm/leads/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          updates,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to bulk update leads');
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
                Bulk Update Leads
              </h3>
              <p className="text-xs text-slate-500">
                Updating {selectedIds.length} selected {selectedIds.length === 1 ? 'lead' : 'leads'} simultaneously
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
            Check the fields you wish to change. Unchecked fields will remain unchanged on all selected records.
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

          {/* Lead Status */}
          <div className={`p-3.5 rounded-xl border transition-colors ${updateStatus ? 'bg-yellow-50/50 border-yellow-300 ring-1 ring-yellow-400/30' : 'bg-slate-50/70 border-slate-200/80'}`}>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-2">
              <input
                type="checkbox"
                checked={updateStatus}
                onChange={(e) => setUpdateStatus(e.target.checked)}
                className="w-4 h-4 text-yellow-500 rounded border-slate-300 focus:ring-yellow-400"
              />
              <Tag className="w-4 h-4 text-slate-500" />
              <span>Update Lead Status</span>
            </label>

            {updateStatus && (
              <div className="pl-6 pt-1">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-900 bg-white text-xs sm:text-sm font-medium"
                >
                  <option value="new">New Inquiry</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="unqualified">Unqualified</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
            )}
          </div>

          {/* Priority */}
          <div className={`p-3.5 rounded-xl border transition-colors ${updatePriority ? 'bg-yellow-50/50 border-yellow-300 ring-1 ring-yellow-400/30' : 'bg-slate-50/70 border-slate-200/80'}`}>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-2">
              <input
                type="checkbox"
                checked={updatePriority}
                onChange={(e) => setUpdatePriority(e.target.checked)}
                className="w-4 h-4 text-yellow-500 rounded border-slate-300 focus:ring-yellow-400"
              />
              <Flag className="w-4 h-4 text-slate-500" />
              <span>Update Priority</span>
            </label>

            {updatePriority && (
              <div className="pl-6 pt-1">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-900 bg-white text-xs sm:text-sm font-medium"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="hot">🔥 Hot Lead</option>
                </select>
              </div>
            )}
          </div>

          {/* Lead Source */}
          <div className={`p-3.5 rounded-xl border transition-colors ${updateSource ? 'bg-yellow-50/50 border-yellow-300 ring-1 ring-yellow-400/30' : 'bg-slate-50/70 border-slate-200/80'}`}>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-2">
              <input
                type="checkbox"
                checked={updateSource}
                onChange={(e) => setUpdateSource(e.target.checked)}
                className="w-4 h-4 text-yellow-500 rounded border-slate-300 focus:ring-yellow-400"
              />
              <Sparkles className="w-4 h-4 text-slate-500" />
              <span>Update Lead Source</span>
            </label>

            {updateSource && (
              <div className="pl-6 pt-1">
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-900 bg-white text-xs sm:text-sm font-medium"
                >
                  <option value="website">Website Form</option>
                  <option value="referral">Referral / Word of Mouth</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="instagram">Instagram</option>
                  <option value="outreach">Cold Outreach</option>
                  <option value="partner">Partner Agency</option>
                  <option value="other">Other</option>
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
              disabled={isSubmitting || (!updateAssignedTo && !updateStatus && !updatePriority && !updateSource)}
              className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold transition-all shadow-xs text-xs sm:text-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : `Apply to ${selectedIds.length} Leads`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
