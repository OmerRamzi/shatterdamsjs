import { useState, useEffect, useCallback } from "react";
import { Link2, Plus, Loader2, Trash2, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { IntegrationSettingsModal } from "../../components/admin/IntegrationSettingsModal";

const AdminCommissionsPage = () => {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  
  const [clients, setClients] = useState<any[]>([]);

  // Pagination & Search state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  
  const [totalEarned, setTotalEarned] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    source: "",
    clientId: "",
    amount: "",
    currency: "USD",
    date: new Date().toISOString().split('T')[0],
    status: "pending",
    notes: ""
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const resCommissions = await fetch(`/api/commissions?${params.toString()}`);
      if (resCommissions.ok) {
        const res = await resCommissions.json();
        if (res.data) {
          setCommissions(res.data);
          setTotal(res.total || 0);
          
          // Simple local metrics, in Phase 7 this will be SQL backed
          const earned = res.data
            .filter((c: any) => c.commission.status === 'paid')
            .reduce((acc: number, curr: any) => acc + parseFloat(curr.commission.amount), 0);
          setTotalEarned(earned);
          
          const pending = res.data.filter((c: any) => c.commission.status === 'pending').length;
          setPendingCount(pending);
        } else {
          setCommissions(res);
        }
      }

      if (clients.length === 0) {
        const resClients = await fetch("/api/clients");
        if (resClients.ok) setClients(await resClients.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [search, status, from, to, page, limit, clients.length]);

  useEffect(() => {
    const delay = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(delay);
  }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          clientId: formData.clientId ? parseInt(formData.clientId) : null,
          amount: parseFloat(formData.amount)
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        alert("Failed to create commission");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCommission = async (id: number) => {
    if (!confirm("Are you sure you want to delete this commission record?")) return;
    try {
      await fetch(`/api/commissions/${id}`, { method: "DELETE" });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const statuses = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Paid', value: 'paid' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Partner Commissions</h1>
          <p className="text-muted-foreground mt-1">Track external referrals and API webhook payloads.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsWebhookModalOpen(true)} className="btn-secondary flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Integrations
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Record
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm bg-gradient-to-br from-emerald-500/10 to-transparent">
          <h3 className="text-sm font-medium text-emerald-600 flex items-center gap-2">
            Total Earned (View)
          </h3>
          <p className="text-4xl font-bold mt-2 text-emerald-700">{totalEarned.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm bg-gradient-to-br from-amber-500/10 to-transparent">
          <h3 className="text-sm font-medium text-amber-600 flex items-center gap-2">
            Pending (View)
          </h3>
          <p className="text-4xl font-bold mt-2 text-amber-700">
            {pendingCount}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar w-full sm:w-auto">
              {statuses.map(s => (
                <button
                  key={s.value}
                  onClick={() => { setStatus(s.value); setPage(1); }}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    status === s.value 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                className="bg-secondary/50 border-none rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                title="From Date"
              />
              <input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPage(1); }}
                className="bg-secondary/50 border-none rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                title="To Date"
              />
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full bg-secondary/50 border-none rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Source</th>
                <th className="px-6 py-4 font-medium">Client</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : commissions.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No commission records found.</td></tr>
              ) : (
                commissions.map(({ commission, client }) => (
                  <tr key={commission.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">{new Date(commission.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium">
                      {commission.source}
                      {commission.referenceId && <span className="block text-xs text-muted-foreground">Ref: {commission.referenceId}</span>}
                    </td>
                    <td className="px-6 py-4">{client?.companyName || <span className="text-muted-foreground">-</span>}</td>
                    <td className="px-6 py-4 font-semibold">{commission.currency} {parseFloat(commission.amount).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        commission.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {commission.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => deleteCommission(commission.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {total > 0 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium px-2">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Log Commission</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Source</label>
                <input required type="text" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Shopify Referral" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Client (Optional)</label>
                <select value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                  <option value="">None</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Currency</label>
                  <select required value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="LKR">LKR</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" rows={2}></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Integration Settings Modal */}
      <IntegrationSettingsModal 
        isOpen={isWebhookModalOpen} 
        onClose={() => setIsWebhookModalOpen(false)} 
        tenantId={user?.tenantId} 
      />
    </div>
  );
};

export default AdminCommissionsPage;
