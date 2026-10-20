import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  TrendingUp, 
  DollarSign, 
  Users, 
  ChevronRight, 
  ChevronLeft,
  Kanban,
  List,
  Search,
  Building2,
  Pencil,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DealModal } from '../../../components/admin/crm/DealModal';

interface Deal {
  id: number;
  title: string;
  stage: 'discovery' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  amount: string;
  currency: string;
  probability: number;
  expectedCloseDate: string | null;
  clientId: number | null;
  client?: { id: number; companyName: string } | null;
  leadId: number | null;
  lead?: { id: number; title: string } | null;
  assignedTo: number | null;
  assignedUser?: { id: number; name: string } | null;
  lostReason?: string | null;
  createdAt: string;
}

interface CrmStats {
  totalPipelineValue: number;
  wonValue: number;
  totalDeals: number;
  winRate: number;
  activeLeads: number;
  stageCounts: Record<string, { count: number; value: number }>;
}

const STAGES: { key: Deal['stage']; title: string; color: string; bg: string; dot: string }[] = [
  { key: 'discovery', title: '1. Discovery', color: 'text-slate-700', bg: 'bg-slate-100/80 border-slate-200', dot: 'bg-slate-400' },
  { key: 'qualified', title: '2. Qualified', color: 'text-sky-800', bg: 'bg-sky-50/80 border-sky-200', dot: 'bg-sky-500' },
  { key: 'proposal', title: '3. Proposal Sent', color: 'text-indigo-800', bg: 'bg-indigo-50/80 border-indigo-200', dot: 'bg-indigo-500' },
  { key: 'negotiation', title: '4. Negotiation', color: 'text-amber-800', bg: 'bg-amber-50/80 border-amber-200', dot: 'bg-amber-500' },
  { key: 'won', title: '5. Closed Won', color: 'text-emerald-800', bg: 'bg-emerald-50/80 border-emerald-200', dot: 'bg-emerald-500' },
  { key: 'lost', title: '6. Closed Lost', color: 'text-rose-800', bg: 'bg-rose-50/80 border-rose-200', dot: 'bg-rose-400' },
];

export default function CrmDashboard() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stats, setStats] = useState<CrmStats>({
    totalPipelineValue: 0,
    wonValue: 0,
    totalDeals: 0,
    winRate: 0,
    activeLeads: 0,
    stageCounts: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');

  // Deal Modal state
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [defaultStage, setDefaultStage] = useState('discovery');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dealsRes, statsRes] = await Promise.all([
        fetch('/api/crm/deals'),
        fetch('/api/crm/stats'),
      ]);
      if (dealsRes.ok) setDeals(await dealsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error('CRM load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Stage change handler
  const handleStageChange = async (dealId: number, newStage: Deal['stage']) => {
    try {
      const res = await fetch(`/api/crm/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: newStage,
          probability: newStage === 'won' ? 100 : newStage === 'lost' ? 0 : undefined
        }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Stage change error:', err);
    }
  };

  const handleDeleteDeal = async (id: number) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;
    try {
      const res = await fetch(`/api/crm/deals/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Delete deal error:', err);
    }
  };

  const openNewDeal = (stage = 'discovery') => {
    setSelectedDeal(null);
    setDefaultStage(stage);
    setIsDealModalOpen(true);
  };

  const openEditDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    setIsDealModalOpen(true);
  };

  const filteredDeals = deals.filter(d => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.title.toLowerCase().includes(term) ||
      (d.client?.companyName && d.client.companyName.toLowerCase().includes(term)) ||
      (d.lead?.title && d.lead.title.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>CRM & Sales Pipeline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Deals & Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track prospective engagements, deal stages, and revenue conversion.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/crm/leads"
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs sm:text-sm transition-all shadow-xs"
          >
            Manage Leads
          </Link>
          <button
            onClick={() => openNewDeal('discovery')}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-xs hover:shadow transition-all text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Deal</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Pipeline
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center ring-1 ring-amber-200/50">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 truncate">
            Rs. {stats.totalPipelineValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] font-medium text-slate-500 mt-1">
            {stats.totalDeals} opportunities active
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Closed Won
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center ring-1 ring-emerald-200/50">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-600 truncate">
            Rs. {stats.wonValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] font-medium text-slate-500 mt-1">
            {stats.stageCounts?.won?.count || 0} contracts secured
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Win Rate
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center ring-1 ring-sky-200/50">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 truncate">
            {stats.winRate}%
          </h3>
          <p className="text-[11px] font-medium text-slate-500 mt-1">
            Ratio of won vs lost deals
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Leads
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center ring-1 ring-indigo-200/50">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 truncate">
            {stats.activeLeads}
          </h3>
          <p className="text-[11px] font-medium text-slate-500 mt-1">
            Awaiting qualification
          </p>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search deals or clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900"
          />
        </div>

        {/* View Toggle */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold shrink-0">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Kanban Pipeline</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Table List</span>
          </button>
        </div>
      </div>

      {/* Main Pipeline Content */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-400 font-semibold text-sm">
          Loading deals and pipeline metrics...
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban View (Scrollable horizontally on mobile) */
        <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin">
          {STAGES.map((col, idx) => {
            const colDeals = filteredDeals.filter(d => d.stage === col.key);
            const colTotal = colDeals.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

            return (
              <div 
                key={col.key} 
                className="w-72 sm:w-80 shrink-0 flex flex-col rounded-2xl bg-slate-100/60 border border-slate-200/80 p-3 max-h-[75vh]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">{col.title}</h4>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-white text-slate-600 border border-slate-200">
                      {colDeals.length}
                    </span>
                  </div>
                  <button
                    onClick={() => openNewDeal(col.key)}
                    className="p-1 rounded-lg hover:bg-white text-slate-500 hover:text-slate-900 transition-colors"
                    title={`Add deal to ${col.title}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] font-semibold text-slate-500 mb-2 px-1">
                  Rs. {colTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>

                {/* Cards List */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {colDeals.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-medium">
                      No deals in this stage
                    </div>
                  ) : (
                    colDeals.map(deal => (
                      <div
                        key={deal.id}
                        className="group bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-400/80 transition-all text-xs"
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <h5 
                            onClick={() => openEditDeal(deal)}
                            className="font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors cursor-pointer line-clamp-2"
                          >
                            {deal.title}
                          </h5>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditDeal(deal)}
                              className="p-1 text-slate-400 hover:text-slate-700"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteDeal(deal.id)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Client / Lead name */}
                        {deal.client && (
                          <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px] mb-2">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{deal.client.companyName}</span>
                          </div>
                        )}

                        {/* Amount */}
                        <div className="text-sm font-black text-slate-900 mb-2">
                          {deal.currency} {parseFloat(deal.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>

                        {/* Footer details */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                              {deal.probability}% Prob
                            </span>
                          </div>

                          {/* Quick stage advance buttons */}
                          <div className="flex items-center gap-1">
                            {idx > 0 && (
                              <button
                                onClick={() => handleStageChange(deal.id, STAGES[idx - 1].key)}
                                className="p-1 rounded hover:bg-slate-100 text-slate-500"
                                title={`Move to ${STAGES[idx - 1].title}`}
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {idx < STAGES.length - 1 && (
                              <button
                                onClick={() => handleStageChange(deal.id, STAGES[idx + 1].key)}
                                className="p-1 rounded hover:bg-slate-100 text-slate-500"
                                title={`Move to ${STAGES[idx + 1].title}`}
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / Table View */
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Deal Title</th>
                  <th className="py-3 px-4">Client / Account</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Deal Value</th>
                  <th className="py-3 px-4">Win Prob</th>
                  <th className="py-3 px-4">Expected Close</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No matching deals found
                    </td>
                  </tr>
                ) : (
                  filteredDeals.map(deal => {
                    const stageMeta = STAGES.find(s => s.key === deal.stage);

                    return (
                      <tr key={deal.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {deal.title}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {deal.client?.companyName || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${stageMeta?.bg} ${stageMeta?.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stageMeta?.dot}`} />
                            {stageMeta?.title}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-slate-900">
                          {deal.currency} {parseFloat(deal.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-semibold">
                          {deal.probability}%
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditDeal(deal)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDeal(deal.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
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
      )}

      {/* Deal Modal */}
      <DealModal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
        onSaved={() => {
          setIsDealModalOpen(false);
          fetchData();
        }}
        deal={selectedDeal}
        defaultStage={defaultStage}
      />
    </div>
  );
}
