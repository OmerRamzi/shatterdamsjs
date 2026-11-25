import { useState, useEffect, useCallback } from 'react';
import { 
  BookUser, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Building2, 
  ExternalLink, 
  Star, 
  Pencil, 
  Trash2,
  FileSpreadsheet,
  UserCheck,
  CheckSquare
} from 'lucide-react';
import { ContactModal } from '../../../components/admin/crm/ContactModal';
import { CsvImportModal } from '../../../components/admin/crm/CsvImportModal';
import { BulkEditContactsModal } from '../../../components/admin/crm/BulkEditContactsModal';
import { useAuth } from '../../../context/AuthContext';

interface Contact {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  role: 'decision_maker' | 'influencer' | 'billing' | 'technical' | 'primary' | 'other';
  isPrimary: boolean;
  clientId: number | null;
  companyName?: string | null;
  assignedTo?: number | null;
  assignedUser?: { id: number; name: string } | null;
  linkedinUrl: string | null;
  notes: string | null;
  createdAt: string;
}

export default function AdminContactsPage() {
  const { hasPermission, getPermissionScope } = useAuth();
  const canManage = hasPermission('crm', 'manage');
  const canDelete = hasPermission('crm', 'full');
  const isAssignedScope = getPermissionScope('crm') === 'assigned';
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  // Bulk Selection & Edit
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Contact Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/lookups/team')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTeamMembers(data);
      })
      .catch(() => {});
  }, []);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = '/api/crm/contacts?';
      if (assigneeFilter !== 'all') url += `assignedTo=${assigneeFilter}&`;
      const res = await fetch(url);
      if (res.ok) setContacts(await res.json());
    } catch (err) {
      console.error('Fetch contacts error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [assigneeFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      const res = await fetch(`/api/crm/contacts/${id}`, { method: 'DELETE' });
      if (res.ok) fetchContacts();
    } catch (err) {
      console.error('Delete contact error:', err);
    }
  };

  const handleOpenAdd = () => {
    setSelectedContact(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setIsModalOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredContacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContacts.map(c => c.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleQuickBulkUpdate = async (updates: Record<string, any>) => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      const res = await fetch('/api/crm/contacts/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, updates })
      });
      if (res.ok) {
        await fetchContacts();
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Quick bulk update error:', err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected contacts?`)) return;
    setIsBulkProcessing(true);
    try {
      const res = await fetch('/api/crm/contacts/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        await fetchContacts();
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Bulk delete error:', err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const filteredContacts = contacts.filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const fullName = `${c.firstName} ${c.lastName || ''}`.toLowerCase();
    return (
      fullName.includes(term) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.companyName && c.companyName.toLowerCase().includes(term)) ||
      (c.jobTitle && c.jobTitle.toLowerCase().includes(term))
    );
  });

  const getRoleBadge = (role: Contact['role']) => {
    switch (role) {
      case 'decision_maker':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 font-bold px-2 py-0.5 rounded-full text-[10px]">Decision Maker</span>;
      case 'primary':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded-full text-[10px]">Primary Contact</span>;
      case 'billing':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-full text-[10px]">Billing / Accounts</span>;
      case 'technical':
        return <span className="bg-sky-100 text-sky-800 border border-sky-200 font-bold px-2 py-0.5 rounded-full text-[10px]">Technical Lead</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 font-bold px-2 py-0.5 rounded-full text-[10px] capitalize">{role?.replace('_', ' ')}</span>;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>CRM Stakeholders & People</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Contacts Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Stakeholder records, decision makers, and communication logs across client accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canManage && (
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs sm:text-sm transition-all shadow-xs"
              title="Import contacts from Zoho CRM or CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Import CSV</span>
            </button>
          )}
          {canManage && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-xs hover:shadow transition-all text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Contact</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar & Assignee Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, company, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900"
            />
          </div>

          {!isAssignedScope && (
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-800 bg-white"
            >
              <option value="all">All Assignees</option>
              <option value="me">Assigned to Me</option>
              <option value="unassigned">Unassigned Only</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>
                  Assigned to: {m.displayName || m.email}
                </option>
              ))}
            </select>
          )}

          {filteredContacts.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedIds.length > 0 && selectedIds.length === filteredContacts.length
                  ? 'bg-yellow-400 text-slate-950 border-yellow-500 shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{selectedIds.length > 0 ? `Selected (${selectedIds.length})` : 'Select All'}</span>
            </button>
          )}
        </div>

        <div className="text-xs font-semibold text-slate-500 shrink-0">
          {filteredContacts.length} contacts registered
        </div>
      </div>

      {/* Contacts Grid */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-400 font-semibold text-sm">
          Loading contacts directory...
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400">
          <BookUser className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 text-sm">No contacts found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Add key client stakeholders or sync contacts from leads to build your communication database.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map(contact => {
            const fullName = `${contact.firstName} ${contact.lastName || ''}`.trim();
            const initials = `${contact.firstName[0]}${contact.lastName ? contact.lastName[0] : ''}`.toUpperCase();
            const isSelected = selectedIds.includes(contact.id);

            return (
              <div
                key={contact.id}
                className={`group bg-white border rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between ${
                  isSelected 
                    ? 'ring-2 ring-yellow-400 border-yellow-300 bg-yellow-50/25' 
                    : 'border-slate-200/80 hover:shadow-md hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Top Bar: Checkbox, Avatar & Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectOne(contact.id);
                        }}
                        className="w-4 h-4 text-yellow-500 rounded border-slate-300 focus:ring-yellow-400 cursor-pointer shrink-0"
                      />
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-amber-400 font-black text-sm flex items-center justify-center shrink-0 shadow-inner">
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 
                            onClick={() => canManage && handleOpenEdit(contact)}
                            className={`font-extrabold text-sm sm:text-base text-slate-900 ${canManage ? 'group-hover:text-amber-600 transition-colors cursor-pointer' : ''}`}
                          >
                            {fullName}
                          </h4>
                          {contact.isPrimary && (
                            <span title="Primary Contact">
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            </span>
                          )}
                        </div>
                        {contact.jobTitle && (
                          <p className="text-xs text-slate-500">{contact.jobTitle}</p>
                        )}
                      </div>
                    </div>

                    {(canManage || canDelete) && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canManage && (
                          <button
                            onClick={() => handleOpenEdit(contact)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700"
                            title="Edit Contact"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(contact.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600"
                            title="Delete Contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Company */}
                  {contact.companyName && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold mb-3 pb-3 border-b border-slate-100">
                      <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{contact.companyName}</span>
                    </div>
                  )}

                  {/* Contact channels */}
                  <div className="space-y-2 text-xs text-slate-600 mb-3">
                    {contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a href={`mailto:${contact.email}`} className="truncate hover:text-amber-600 hover:underline">
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate font-mono text-slate-800 text-[11px] font-medium">{contact.phone}</span>
                        </div>
                        <a 
                          href={`tel:${contact.phone}`} 
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors shrink-0 shadow-2xs"
                          title={`Direct call to ${fullName}`}
                        >
                          <Phone className="w-2.5 h-2.5 fill-white" />
                          <span>Call</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom footer: Role badge, Assignee & LinkedIn */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getRoleBadge(contact.role)}
                    {contact.assignedUser ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-800 border border-yellow-400/20 text-[10px] font-semibold" title={`Assigned to ${contact.assignedUser.name}`}>
                        <UserCheck className="w-3 h-3 text-yellow-600" />
                        <span className="truncate max-w-[100px]">{contact.assignedUser.name}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                    )}
                  </div>

                  {contact.linkedinUrl && (
                    <a
                      href={contact.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                      title="LinkedIn Profile"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-4xl bg-[#101216] text-white border border-white/10 rounded-2xl p-3 sm:p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-yellow-400 text-slate-950 font-bold flex items-center justify-center text-xs shadow-xs">
              {selectedIds.length}
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm text-slate-100">
                {selectedIds.length} {selectedIds.length === 1 ? 'contact' : 'contacts'} selected
              </p>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Quick updates or open bulk editor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Assign Dropdown */}
            {!isAssignedScope && canManage && (
              <select
                defaultValue=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  const val = e.target.value === 'unassigned' ? null : parseInt(e.target.value);
                  handleQuickBulkUpdate({ assignedTo: val });
                  e.target.value = '';
                }}
                disabled={isBulkProcessing}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-semibold hover:bg-white/15 focus:outline-none focus:ring-1 focus:ring-yellow-400 cursor-pointer disabled:opacity-50"
              >
                <option value="" disabled className="bg-slate-900 text-slate-300">Assign to...</option>
                <option value="unassigned" className="bg-slate-900 text-slate-300">— Unassign —</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                    {m.displayName || m.name || m.email}
                  </option>
                ))}
              </select>
            )}

            {/* Quick Role Dropdown */}
            {canManage && (
              <select
                defaultValue=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  handleQuickBulkUpdate({ role: e.target.value });
                  e.target.value = '';
                }}
                disabled={isBulkProcessing}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-semibold hover:bg-white/15 focus:outline-none focus:ring-1 focus:ring-yellow-400 cursor-pointer disabled:opacity-50"
              >
                <option value="" disabled className="bg-slate-900 text-slate-300">Set role...</option>
                <option value="decision_maker" className="bg-slate-900 text-white">Decision Maker</option>
                <option value="primary" className="bg-slate-900 text-white">Primary Contact</option>
                <option value="billing" className="bg-slate-900 text-white">Billing / Accounts</option>
                <option value="technical" className="bg-slate-900 text-white">Technical Lead</option>
                <option value="influencer" className="bg-slate-900 text-white">Influencer</option>
                <option value="other" className="bg-slate-900 text-white">Other</option>
              </select>
            )}

            {/* Bulk Edit Modal Button */}
            {canManage && (
              <button
                onClick={() => setIsBulkEditModalOpen(true)}
                disabled={isBulkProcessing}
                className="px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
              >
                Bulk Edit...
              </button>
            )}

            {/* Bulk Delete */}
            {canDelete && (
              <button
                onClick={handleBulkDelete}
                disabled={isBulkProcessing}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors disabled:opacity-50"
              >
                Delete ({selectedIds.length})
              </button>
            )}

            {/* Deselect All */}
            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs font-semibold"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <BulkEditContactsModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        onSuccess={() => {
          setIsBulkEditModalOpen(false);
          setSelectedIds([]);
          fetchContacts();
        }}
        selectedIds={selectedIds}
        teamMembers={teamMembers}
      />

      {/* Contact Modal */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          setIsModalOpen(false);
          fetchContacts();
        }}
        contact={selectedContact}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportComplete={() => {
          fetchContacts();
        }}
        defaultType="contacts"
      />
    </div>
  );
}
