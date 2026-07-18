import { useState, useEffect } from "react";
import { Link2, Plus, Loader2, Link, Trash2, Copy, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function AdminCommissionsPage() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  
  const [clients, setClients] = useState<any[]>([]);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [isCopied, setIsCopied] = useState(false);

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

  const fetchData = async () => {
    try {
      const resCommissions = await fetch("/api/commissions");
      if (resCommissions.ok) setCommissions(await resCommissions.json());

      const resClients = await fetch("/api/clients");
      if (resClients.ok) setClients(await resClients.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateTotal = (currency: string = 'USD') => {
    return commissions
      .filter(c => c.commission.currency === currency && c.commission.status === 'paid')
      .reduce((acc, curr) => acc + parseFloat(curr.commission.amount), 0);
  };

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

  const fetchWebhookSecret = async () => {
    try {
      const res = await fetch("/api/commissions/webhook-secret");
      if (res.ok) {
        const data = await res.json();
        setWebhookSecret(data.secret);
        setIsWebhookModalOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyWebhookUrl = () => {
    const url = `${window.location.protocol}//${window.location.hostname}:8787/api/webhooks/commissions/${user?.tenantId}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Partner Commissions</h1>
          <p className="text-muted-foreground mt-1">Track external referrals and API webhook payloads.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchWebhookSecret} className="btn-secondary flex items-center gap-2">
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
            Total Earned (USD)
          </h3>
          <p className="text-4xl font-bold mt-2 text-emerald-700">${calculateTotal('USD').toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm bg-gradient-to-br from-amber-500/10 to-transparent">
          <h3 className="text-sm font-medium text-amber-600 flex items-center gap-2">
            Pending Commissions
          </h3>
          <p className="text-4xl font-bold mt-2 text-amber-700">
            {commissions.filter(c => c.commission.status === 'pending').length}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
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

      {/* Webhook Modal */}
      {isWebhookModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><Link className="w-5 h-5" /> API Integration</h2>
            <p className="text-sm text-muted-foreground mb-6">Use this webhook URL and secret to automatically push commissions from external partners (like Shopify or Stripe) directly into your dashboard.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1 text-slate-700">Webhook POST URL</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={`${window.location.protocol}//${window.location.hostname}:8787/api/webhooks/commissions/${user?.tenantId}`} className="w-full bg-secondary/50 font-mono text-xs border border-border rounded-lg px-3 py-3 text-slate-600" />
                  <button onClick={copyWebhookUrl} className="p-3 bg-secondary rounded-lg hover:bg-slate-200 transition-colors" title="Copy URL">
                    {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-600" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-1 text-slate-700">Webhook Secret</label>
                <input readOnly value={webhookSecret} className="w-full bg-secondary/50 font-mono text-xs border border-border rounded-lg px-3 py-3 text-slate-600" />
                <p className="text-xs text-muted-foreground mt-1">Pass this token in the <code className="text-amber-600">x-webhook-secret</code> header.</p>
              </div>

              <div className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono overflow-x-auto">
                <p className="text-emerald-400 mb-2">// Payload Example</p>
                {`{
  "source": "Shopify Partner",
  "amount": "45.00",
  "currency": "USD",
  "referenceId": "txn_12345",
  "notes": "Referral payout"
}`}
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button onClick={() => setIsWebhookModalOpen(false)} className="btn-primary w-full">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
