import { useState, useEffect } from 'react';
import { X, Target } from 'lucide-react';

interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  deal?: any;
  defaultStage?: string;
}

export function DealModal({ isOpen, onClose, onSaved, deal, defaultStage = 'discovery' }: DealModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    currency: 'LKR',
    stage: defaultStage,
    probability: 20,
    expectedCloseDate: '',
    clientId: '',
    leadId: '',
    lostReason: '',
  });

  const [clients, setClients] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch('/api/clients').then(r => r.json()).catch(() => []),
        fetch('/api/crm/leads?status=qualified').then(r => r.json()).catch(() => [])
      ]).then(([clientsData, leadsData]) => {
        if (Array.isArray(clientsData)) setClients(clientsData);
        if (Array.isArray(leadsData)) setLeads(leadsData);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (deal) {
      setFormData({
        title: deal.title || '',
        amount: deal.amount || '',
        currency: deal.currency || 'LKR',
        stage: deal.stage || defaultStage,
        probability: deal.probability !== undefined ? deal.probability : 20,
        expectedCloseDate: deal.expectedCloseDate || '',
        clientId: deal.clientId ? String(deal.clientId) : '',
        leadId: deal.leadId ? String(deal.leadId) : '',
        lostReason: deal.lostReason || '',
      });
    } else {
      setFormData({
        title: '',
        amount: '',
        currency: 'LKR',
        stage: defaultStage,
        probability: defaultStage === 'won' ? 100 : defaultStage === 'proposal' ? 60 : 20,
        expectedCloseDate: '',
        clientId: '',
        leadId: '',
        lostReason: '',
      });
    }
    setError('');
  }, [deal, defaultStage, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Deal title is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const url = deal ? `/api/crm/deals/${deal.id}` : '/api/crm/deals';
      const method = deal ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        amount: formData.amount || '0',
        probability: Number(formData.probability),
        clientId: formData.clientId ? parseInt(formData.clientId) : null,
        leadId: formData.leadId ? parseInt(formData.leadId) : null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save deal');
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error saving deal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center ring-1 ring-emerald-200/60">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {deal ? 'Edit Deal Opportunity' : 'New Sales Deal'}
              </h3>
              <p className="text-xs text-slate-500">Pipeline revenue and negotiation stage</p>
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

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Deal Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Q4 Commercial Production Contract"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Deal Amount</label>
              <input
                type="number"
                placeholder="500000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 bg-white"
              >
                <option value="LKR">LKR (Rs.)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Pipeline Stage</label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 bg-white"
              >
                <option value="discovery">1. Discovery / Inquiry</option>
                <option value="qualified">2. Qualified</option>
                <option value="proposal">3. Proposal Sent</option>
                <option value="negotiation">4. In Negotiation</option>
                <option value="won">5. Closed Won 🎉</option>
                <option value="lost">6. Closed Lost</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Win Probability (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Associated Client</label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 bg-white"
              >
                <option value="">None / Select Client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Originating Lead</label>
              <select
                value={formData.leadId}
                onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 bg-white"
              >
                <option value="">None / Standalone</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Expected Close Date</label>
              <input
                type="date"
                value={formData.expectedCloseDate}
                onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 bg-white"
              />
            </div>
          </div>

          {formData.stage === 'lost' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Lost Reason</label>
              <input
                type="text"
                placeholder="e.g. Budget constraints, chose competitor, timing postponed..."
                value={formData.lostReason}
                onChange={(e) => setFormData({ ...formData, lostReason: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400 text-slate-900 bg-rose-50/30"
              />
            </div>
          )}

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
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold transition-all shadow-xs text-xs sm:text-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : deal ? 'Update Deal' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
