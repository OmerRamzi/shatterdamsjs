import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Building2, 
  ArrowRight, 
  Pencil, 
  Trash2,
  FileSpreadsheet
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { LeadModal } from '../../../components/admin/crm/LeadModal';
import { ConvertLeadModal } from '../../../components/admin/crm/ConvertLeadModal';
import { CsvImportModal } from '../../../components/admin/crm/CsvImportModal';
import { BulkEditLeadsModal } from '../../../components/admin/crm/BulkEditLeadsModal';
import { useAuth } from '../../../context/AuthContext';

interface Lead {
  id: number;
  title: string;
  companyName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost';
  priority: 'low' | 'medium' | 'high' | 'hot';
  estimatedValue: string | null;
  currency: string;
  assignedTo: number | null;
  assignedUser?: { id: number; name: string } | null;
  convertedToClientId: number | null;
  notes: string | null;
  createdAt: string;
}

export default function AdminLeadsPage() {
  const navigate = useNavigate();
  const { hasPermission, getPermissionScope } = useAuth();
  const canManage = hasPermission('crm', 'manage');
  const canDelete = hasPermission('crm', 'full');
  const canViewClients = hasPermission('clients', 'view');
  const isAssignedScope = getPermissionScope('crm') === 'assigned';
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  // Bulk Selection & Edit
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Modals
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/lookups/team')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTeamMembers(data);
      })
      .catch(() => {});
  }, []);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = '/api/crm/leads?';
      if (statusFilter !== 'all') url += `status=${statusFilter}&`;
      if (priorityFilter !== 'all') url += `priority=${priorityFilter}&`;
      if (assigneeFilter !== 'all') url += `assignedTo=${assigneeFilter}&`;

      const res = await fetch(url);
      if (res.ok) setLeads(await res.json());
    } catch (err) {
      console.error('Fetch leads error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, priorityFilter, assigneeFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await fetch(`/api/crm/leads/${id}`, { method: 'DELETE' });
      if (res.ok) fetchLeads();
    } catch (err) {
      console.error('Delete lead error:', err);
    }
  };

  const handleOpenAdd = () => {
    setSelectedLead(null);
    setIsLeadModalOpen(true);
  };

  const handleOpenEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setIsLeadModalOpen(true);
  };

  const handleOpenConvert = (lead: Lead) => {
    setConvertingLead(lead);
    setIsConvertModalOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map(l => l.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleQuickBulkUpdate = async (updates: Record<string, any>) => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      const res = await fetch('/api/crm/leads/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, updates })
      });
      if (res.ok) {
        await fetchLeads();
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
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected leads?`)) return;
    setIsBulkProcessing(true);
    try {
      const res = await fetch('/api/crm/leads/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        await fetchLeads();
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Bulk delete error:', err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const filteredLeads = leads.filter(l => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.title.toLowerCase().includes(term) ||
      (l.companyName && l.companyName.toLowerCase().includes(term)) ||
      (l.contactName && l.contactName.toLowerCase().includes(term)) ||
      (l.email && l.email.toLowerCase().includes(term))
    );
  });

  const getPriorityBadge = (p: Lead['priority']) => {
    switch (p) {
      case 'hot':
        return <span className="bg-rose-100 text-rose-800 border border-rose-200 font-bold px-2 py-0.5 rounded-full text-[10px]">🔥 Hot</span>;
      case 'high':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-full text-[10px]">High</span>;
      case 'medium':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 font-bold px-2 py-0.5 rounded-full text-[10px]">Medium</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 font-bold px-2 py-0.5 rounded-full text-[10px]">Low</span>;
    }
  };

  const getStatusBadge = (s: Lead['status']) => {
    switch (s) {
      case 'new':
        return <span className="bg-sky-50 text-sky-700 border border-sky-200 font-bold px-2 py-0.5 rounded-full text-[10px]">New Inquiry</span>;
      case 'contacted':
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-2 py-0.5 rounded-full text-[10px]">Contacted</span>;
      case 'qualified':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full text-[10px]">Qualified</span>;
      case 'converted':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full text-[10px]">Converted</span>;
      case 'lost':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 font-bold px-2 py-0.5 rounded-full text-[10px]">Lost</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full text-[10px]">{s}</span>;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>CRM & Inbound Sales</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Leads Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Capture prospective clients, score priority, and convert qualified leads into accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canManage && (
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs sm:text-sm transition-all shadow-xs"
              title="Import leads from Zoho CRM or CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Import CSV</span>
            </button>
          )}
          <Link
            to="/crm"
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs sm:text-sm transition-all shadow-xs"
          >
            View Pipeline
          </Link>
          {canManage && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-xs hover:shadow transition-all text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Capture Lead</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Status Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs font-bold text-slate-600">
          {[
            { key: 'all', label: 'All Leads' },
            { key: 'new', label: 'New' },
            { key: 'contacted', label: 'Contacted' },
            { key: 'qualified', label: 'Qualified' },
            { key: 'converted', label: 'Converted' },
            { key: 'lost', label: 'Lost' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                statusFilter === tab.key
                  ? 'bg-amber-400/20 text-amber-900 ring-1 ring-amber-400/40'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right filters & search */}
        <div className="flex flex-wrap items-center gap-2.5">
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
                  {m.displayName || m.email}
                </option>
              ))}
            </select>
          )}

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-800 bg-white"
          >
            <option value="all">All Priorities</option>
            <option value="hot">🔥 Hot</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <div className="relative w-full sm:w-52">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && selectedIds.length === filteredLeads.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-yellow-500 rounded border-slate-300 focus:ring-yellow-400 cursor-pointer"
                    title="Select All"
                  />
                </th>
                <th className="py-3.5 px-4">Opportunity / Title</th>
                <th className="py-3.5 px-4">Contact Person</th>
                <th className="py-3.5 px-4">Assigned To</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Estimated Value</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                    Loading leads...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No leads found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Capture a new lead or adjust active filters.</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map(lead => {
                  const isSelected = selectedIds.includes(lead.id);

                  return (
                    <tr 
                      key={lead.id} 
                      className={`transition-colors ${isSelected ? 'bg-yellow-50/60 hover:bg-yellow-50/80' : 'hover:bg-slate-50/50'}`}
                    >
                      <td className="py-3.5 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(lead.id)}
                          className="w-4 h-4 text-yellow-500 rounded border-slate-300 focus:ring-yellow-400 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <div>
                          <span 
                            onClick={() => canManage && handleOpenEdit(lead)}
                            className={`font-bold text-slate-900 block ${canManage ? 'hover:text-amber-600 transition-colors cursor-pointer' : ''}`}
                          >
                            {lead.title}
                          </span>
                          {lead.companyName && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>{lead.companyName}</span>
                            </div>
                          )}
                        </div>
                      </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-slate-800 block">
                          {lead.contactName || '—'}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} className="hover:text-amber-600 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[110px]">{lead.email}</span>
                            </a>
                          )}
                          {lead.phone && (
                            <a 
                              href={`tel:${lead.phone}`} 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] transition-colors"
                              title={`Call ${lead.contactName || lead.phone}`}
                            >
                              <Phone className="w-2.5 h-2.5 fill-emerald-600" />
                              <span>{lead.phone}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {lead.assignedUser ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-yellow-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {lead.assignedUser.name[0]?.toUpperCase()}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 truncate max-w-[100px]">
                            {lead.assignedUser.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {getPriorityBadge(lead.priority)}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(lead.status)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 capitalize text-xs">
                      {lead.source}
                    </td>

                    <td className="py-3.5 px-4 font-black text-slate-900">
                      {lead.estimatedValue && parseFloat(lead.estimatedValue) > 0 ? (
                        `${lead.currency} ${parseFloat(lead.estimatedValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      ) : (
                        <span className="text-slate-400 font-normal">Unspecified</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {lead.status !== 'converted' ? (
                          canManage && (
                            <button
                              onClick={() => handleOpenConvert(lead)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition-colors"
                              title="Convert to Client account"
                            >
                              <span>Convert</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )
                        ) : (
                          canViewClients ? (
                            <Link
                              to={`/clients/${lead.convertedToClientId}`}
                              className="text-xs font-semibold text-emerald-600 hover:underline"
                            >
                              View Client
                            </Link>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-600">Converted</span>
                          )
                        )}

                        {canManage && (
                          <button
                            onClick={() => handleOpenEdit(lead)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Edit Lead"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-4xl bg-[#101216] text-white border border-white/10 rounded-2xl p-3 sm:p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-yellow-400 text-slate-950 font-bold flex items-center justify-center text-xs shadow-xs">
              {selectedIds.length}
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm text-slate-100">
                {selectedIds.length} {selectedIds.length === 1 ? 'lead' : 'leads'} selected
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

            {/* Quick Status Dropdown */}
            {canManage && (
              <select
                defaultValue=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  handleQuickBulkUpdate({ status: e.target.value });
                  e.target.value = '';
                }}
                disabled={isBulkProcessing}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-semibold hover:bg-white/15 focus:outline-none focus:ring-1 focus:ring-yellow-400 cursor-pointer disabled:opacity-50"
              >
                <option value="" disabled className="bg-slate-900 text-slate-300">Set status...</option>
                <option value="new" className="bg-slate-900 text-white">New Inquiry</option>
                <option value="contacted" className="bg-slate-900 text-white">Contacted</option>
                <option value="qualified" className="bg-slate-900 text-white">Qualified</option>
                <option value="unqualified" className="bg-slate-900 text-white">Unqualified</option>
                <option value="converted" className="bg-slate-900 text-white">Converted</option>
                <option value="lost" className="bg-slate-900 text-white">Lost</option>
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
      <BulkEditLeadsModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        onSuccess={() => {
          setIsBulkEditModalOpen(false);
          setSelectedIds([]);
          fetchLeads();
        }}
        selectedIds={selectedIds}
        teamMembers={teamMembers}
      />

      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        onSaved={() => {
          setIsLeadModalOpen(false);
          fetchLeads();
        }}
        lead={selectedLead}
      />

      <ConvertLeadModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        onConverted={(newClient) => {
          setIsConvertModalOpen(false);
          fetchLeads();
          if (newClient?.id && canViewClients) {
            navigate(`/clients/${newClient.id}`);
          }
        }}
        lead={convertingLead}
      />

      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportComplete={() => {
          fetchLeads();
        }}
        defaultType="leads"
      />
    </div>
  );
}
