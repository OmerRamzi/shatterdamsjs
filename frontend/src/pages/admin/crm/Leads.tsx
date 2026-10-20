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
  Trash2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { LeadModal } from '../../../components/admin/crm/LeadModal';
import { ConvertLeadModal } from '../../../components/admin/crm/ConvertLeadModal';

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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modals
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = '/api/crm/leads?';
      if (statusFilter !== 'all') url += `status=${statusFilter}&`;
      if (priorityFilter !== 'all') url += `priority=${priorityFilter}&`;

      const res = await fetch(url);
      if (res.ok) setLeads(await res.json());
    } catch (err) {
      console.error('Fetch leads error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, priorityFilter]);

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
          <Link
            to="/crm"
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs sm:text-sm transition-all shadow-xs"
          >
            View Pipeline
          </Link>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-xs hover:shadow transition-all text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Capture Lead</span>
          </button>
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
        <div className="flex items-center gap-2.5">
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

          <div className="relative w-full sm:w-56">
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
                <th className="py-3.5 px-4">Opportunity / Title</th>
                <th className="py-3.5 px-4">Contact Person</th>
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
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                    Loading leads...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No leads found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Capture a new lead or adjust active filters.</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span 
                          onClick={() => handleOpenEdit(lead)}
                          className="font-bold text-slate-900 hover:text-amber-600 transition-colors cursor-pointer block"
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
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} className="hover:text-amber-600 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[120px]">{lead.email}</span>
                            </a>
                          )}
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="hover:text-amber-600 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
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
                          <button
                            onClick={() => handleOpenConvert(lead)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition-colors"
                            title="Convert to Client account"
                          >
                            <span>Convert</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <Link
                            to={`/clients/${lead.convertedToClientId}`}
                            className="text-xs font-semibold text-emerald-600 hover:underline"
                          >
                            View Client
                          </Link>
                        )}

                        <button
                          onClick={() => handleOpenEdit(lead)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Edit Lead"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
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
          if (newClient?.id) {
            navigate(`/clients/${newClient.id}`);
          }
        }}
        lead={convertingLead}
      />
    </div>
  );
}
