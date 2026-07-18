import { useState, useEffect } from "react";
import { DollarSign, Plus, Loader2, PlayCircle, PauseCircle, Trash2 } from "lucide-react";

export default function AdminFinancialsPage() {
  const [streams, setStreams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    clientId: "",
    amount: "",
    currency: "USD",
    frequency: "monthly",
    autoGenerateInvoice: true,
    nextBillingDate: ""
  });

  const fetchStreams = async () => {
    try {
      const res = await fetch("/api/revenue/streams");
      if (res.ok) {
        setStreams(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch streams", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) setClients(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStreams();
    fetchClients();
  }, []);

  const calculateMRR = () => {
    let mrr = 0;
    streams.forEach(({ stream }) => {
      if (stream.status === 'active' && stream.currency === 'USD') { // Assuming base currency USD for aggregate
        let val = parseFloat(stream.amount);
        if (stream.frequency === 'yearly') val /= 12;
        if (stream.frequency === 'quarterly') val /= 3;
        if (stream.frequency === 'weekly') val = (val * 52) / 12;
        if (stream.frequency !== 'one_time') {
          mrr += val;
        }
      }
    });
    return mrr;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/revenue/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          clientId: parseInt(formData.clientId),
          amount: parseFloat(formData.amount)
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchStreams();
      } else {
        alert("Failed to create stream");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await fetch(`/api/revenue/streams/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      fetchStreams();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteStream = async (id: number) => {
    if (!confirm("Are you sure you want to delete this revenue stream?")) return;
    try {
      await fetch(`/api/revenue/streams/${id}`, { method: "DELETE" });
      fetchStreams();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financials & MRR</h1>
          <p className="text-muted-foreground mt-1">Manage recurring revenue streams and auto-billing.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Stream
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" /> Total MRR (USD)
          </h3>
          <p className="text-4xl font-bold mt-2">${calculateMRR().toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-blue-500" /> Active Streams
          </h3>
          <p className="text-4xl font-bold mt-2">{streams.filter(s => s.stream.status === 'active').length}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">Stream Name</th>
              <th className="px-6 py-4 font-medium">Client</th>
              <th className="px-6 py-4 font-medium">Amount</th>
              <th className="px-6 py-4 font-medium">Billing</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
            ) : streams.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No revenue streams found.</td></tr>
            ) : (
              streams.map(({ stream, client }) => (
                <tr key={stream.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-6 py-4 font-medium">{stream.name}</td>
                  <td className="px-6 py-4">{client?.companyName}</td>
                  <td className="px-6 py-4 font-semibold">{stream.currency} {parseFloat(stream.amount).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className="capitalize">{stream.frequency.replace('_', ' ')}</span>
                    <br />
                    {stream.autoGenerateInvoice ? (
                      <span className="text-xs text-emerald-500">Auto-Invoice ON (Next: {stream.nextBillingDate ? new Date(stream.nextBillingDate).toLocaleDateString() : 'N/A'})</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Auto-Invoice OFF</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      stream.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground'
                    }`}>
                      {stream.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button onClick={() => toggleStatus(stream.id, stream.status)} className="p-2 text-muted-foreground hover:text-primary transition-colors" title="Toggle Status">
                      {stream.status === 'active' ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                    </button>
                    <button onClick={() => deleteStream(stream.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">New Revenue Stream</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Monthly Retainer" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Client</label>
                <select required value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select a client...</option>
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
                    <option value="AUD">AUD</option>
                    <option value="LKR">LKR</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Frequency</label>
                  <select required value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one_time">One Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Next Billing Date</label>
                  <input required type="date" value={formData.nextBillingDate} onChange={e => setFormData({...formData, nextBillingDate: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="autoGenerate" checked={formData.autoGenerateInvoice} onChange={e => setFormData({...formData, autoGenerateInvoice: e.target.checked})} className="rounded text-primary focus:ring-primary/50" />
                <label htmlFor="autoGenerate" className="text-sm font-medium">Auto-generate invoices</label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
