import { useState, useEffect } from "react";
import { DollarSign, Plus, Loader2, PlayCircle, PauseCircle, Trash2, Edit, FileText, Receipt, CheckCircle, Clock } from "lucide-react";

export default function AdminFinancialsPage() {
  const [streams, setStreams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Modal & Details State
  const [modalMode, setModalMode] = useState<'create'|'view'|'edit'|null>(null);
  const [selectedStreamId, setSelectedStreamId] = useState<number | null>(null);
  const [streamDetails, setStreamDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    clientId: "",
    projectId: "",
    amount: "",
    currency: "USD",
    frequency: "monthly",
    autoGenerateInvoice: true,
    nextBillingDate: "",
    description: ""
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

  const fetchClientsAndProjects = async () => {
    try {
      const [clientsRes, projectsRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/projects")
      ]);
      if (clientsRes.ok) setClients(await clientsRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStreams();
    fetchClientsAndProjects();
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

  const openCreateModal = () => {
    setSelectedStreamId(null);
    setFormData({
      name: "",
      clientId: "",
      projectId: "",
      amount: "",
      currency: "USD",
      frequency: "monthly",
      autoGenerateInvoice: true,
      nextBillingDate: "",
      description: ""
    });
    setModalMode('create');
  };

  const openViewModal = async (id: number) => {
    setSelectedStreamId(id);
    setModalMode('view');
    setIsLoadingDetails(true);
    try {
      const res = await fetch(`/api/revenue/streams/${id}`);
      if (res.ok) {
        setStreamDetails(await res.json());
      } else {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        alert("Failed to load stream details: " + JSON.stringify(err));
        setModalMode(null);
      }
    } catch (e: any) {
      console.error(e);
      alert("Error: " + e.message);
      setModalMode(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const openEditModal = () => {
    if (streamDetails?.stream) {
      setFormData({
        name: streamDetails.stream.name,
        clientId: streamDetails.stream.clientId.toString(),
        projectId: streamDetails.stream.projectId ? streamDetails.stream.projectId.toString() : "",
        amount: streamDetails.stream.amount,
        currency: streamDetails.stream.currency,
        frequency: streamDetails.stream.frequency,
        autoGenerateInvoice: streamDetails.stream.autoGenerateInvoice,
        nextBillingDate: streamDetails.stream.nextBillingDate ? streamDetails.stream.nextBillingDate.split('T')[0] : "",
        description: streamDetails.stream.description || ""
      });
      setModalMode('edit');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = modalMode === 'edit' ? `/api/revenue/streams/${selectedStreamId}` : "/api/revenue/streams";
      const method = modalMode === 'edit' ? "PUT" : "POST";
      
      const payload: any = {
        ...formData,
        clientId: parseInt(formData.clientId as string),
        amount: parseFloat(formData.amount as string)
      };
      if (formData.projectId) {
        payload.projectId = parseInt(formData.projectId as string);
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        if (modalMode === 'edit' && selectedStreamId) {
          await openViewModal(selectedStreamId); // refresh details view
        } else {
          setModalMode(null);
        }
        fetchStreams();
      } else {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        alert(`Failed to ${modalMode} stream: ` + JSON.stringify(err));
      }
    } catch (error: any) {
      alert("Error: " + error.message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch(`/api/revenue/streams/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchStreams();
        if (selectedStreamId === id && modalMode === 'view') {
           setStreamDetails((prev: any) => ({
             ...prev,
             stream: { ...prev.stream, status: newStatus }
           }));
        }
      } else {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        alert("Failed to update status: " + JSON.stringify(err));
      }
    } catch (e: any) {
      console.error(e);
      alert("Error: " + e.message);
    }
  };

  const deleteStream = async (id: number) => {
    if (!confirm("Are you sure you want to delete this revenue stream?")) return;
    try {
      const res = await fetch(`/api/revenue/streams/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        alert("Failed to delete stream: " + JSON.stringify(err));
        return;
      }
      fetchStreams();
      if (selectedStreamId === id) setModalMode(null);
    } catch (e: any) {
      console.error(e);
      alert("Error: " + e.message);
    }
  };

  // Filter projects based on selected client
  const clientProjects = formData.clientId ? projects.filter(p => p.clientId === parseInt(formData.clientId)) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financials & MRR</h1>
          <p className="text-muted-foreground mt-1">Manage recurring revenue streams and auto-billing.</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
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
                <tr key={stream.id} onClick={() => openViewModal(stream.id)} className="hover:bg-secondary/20 transition-colors cursor-pointer">
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
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 items-center">
                      <button onClick={(e) => { e.stopPropagation(); toggleStatus(stream.id, stream.status); }} className="p-2 text-muted-foreground hover:text-primary transition-colors" title="Toggle Status">
                        {stream.status === 'active' ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteStream(stream.id); }} className="p-2 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Unified Modal */}
      {modalMode !== null && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold">
                {modalMode === 'create' ? 'New Revenue Stream' : 
                 modalMode === 'edit' ? 'Edit Revenue Stream' : 'Stream Details'}
              </h2>
              {modalMode === 'view' && streamDetails && (
                <div className="flex gap-2">
                  <button onClick={openEditModal} className="btn-secondary flex items-center gap-2 py-1.5 px-3">
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button 
                    onClick={() => toggleStatus(streamDetails.stream.id, streamDetails.stream.status)} 
                    className={`btn-secondary flex items-center gap-2 py-1.5 px-3 ${streamDetails.stream.status === 'active' ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600'}`}
                  >
                    {streamDetails.stream.status === 'active' ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                    {streamDetails.stream.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {modalMode === 'view' ? (
                isLoadingDetails ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : streamDetails ? (
                  <div className="space-y-8">
                    {/* Stream Info */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Stream Name</h4>
                        <p className="font-medium text-lg">{streamDetails.stream.name}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Client</h4>
                        <p className="font-medium">{streamDetails.client?.companyName || 'Unknown'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Project</h4>
                        <p className="font-medium">{streamDetails.project?.name || 'None'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Amount</h4>
                        <p className="font-bold text-lg text-primary">{streamDetails.stream.currency} {parseFloat(streamDetails.stream.amount).toFixed(2)}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Frequency</h4>
                        <p className="font-medium capitalize">{streamDetails.stream.frequency.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Next Billing Date</h4>
                        <p className="font-medium flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          {streamDetails.stream.nextBillingDate ? new Date(streamDetails.stream.nextBillingDate).toLocaleDateString() : 'Not Set'}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-block mt-1 ${
                          streamDetails.stream.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground'
                        }`}>
                          {streamDetails.stream.status}
                        </span>
                      </div>
                      {streamDetails.stream.description && (
                        <div className="col-span-2">
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                          <p className="text-sm whitespace-pre-wrap">{streamDetails.stream.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Related Invoices */}
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 border-b border-border pb-2">
                        <FileText className="w-5 h-5 text-blue-500" /> Recent Invoices
                      </h3>
                      {streamDetails.invoices && streamDetails.invoices.length > 0 ? (
                        <div className="space-y-3">
                          {streamDetails.invoices.map((inv: any) => (
                            <div key={inv.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg border border-border/50">
                              <div>
                                <p className="font-medium text-sm">{inv.invoiceNumber} - {inv.title}</p>
                                <p className="text-xs text-muted-foreground">Issued: {new Date(inv.issueDate).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-sm">{inv.currency} {parseFloat(inv.total).toFixed(2)}</p>
                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${inv.status === 'paid' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'}`}>
                                  {inv.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No recent invoices found for this client.</p>
                      )}
                    </div>

                    {/* Revenue Records */}
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 border-b border-border pb-2">
                        <Receipt className="w-5 h-5 text-emerald-500" /> Revenue Records
                      </h3>
                      {streamDetails.records && streamDetails.records.length > 0 ? (
                        <div className="space-y-3">
                          {streamDetails.records.map((rec: any) => (
                            <div key={rec.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg border border-border/50">
                              <div className="flex items-center gap-3">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <p className="text-xs text-muted-foreground">{new Date(rec.recordedAt).toLocaleString()}</p>
                              </div>
                              <p className="font-semibold text-sm text-emerald-500">+{rec.currency} {parseFloat(rec.amount).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No revenue records logged yet.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">Failed to load details.</p>
                )
              ) : (
                <form id="stream-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Monthly Retainer" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" placeholder="Optional details..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Client</label>
                      <select required value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value, projectId: ""})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                        <option value="">Select a client...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Project (Optional)</label>
                      <select value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} disabled={!formData.clientId || clientProjects.length === 0} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm disabled:opacity-50">
                        <option value="">No Project</option>
                        {clientProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
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
                      <input type="date" value={formData.nextBillingDate} onChange={e => setFormData({...formData, nextBillingDate: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input type="checkbox" id="autoGenerate" checked={formData.autoGenerateInvoice} onChange={e => setFormData({...formData, autoGenerateInvoice: e.target.checked})} className="rounded text-primary focus:ring-primary/50" />
                    <label htmlFor="autoGenerate" className="text-sm font-medium">Auto-generate invoices</label>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-border shrink-0 flex justify-end gap-3 bg-secondary/10">
              <button type="button" onClick={() => { setModalMode(null); setStreamDetails(null); }} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                Close
              </button>
              {modalMode !== 'view' && (
                <button type="submit" form="stream-form" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : modalMode === 'edit' ? 'Save Changes' : 'Create Stream'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
