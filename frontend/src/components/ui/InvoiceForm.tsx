"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function InvoiceForm({ clients, projects }: { clients: any[], projects: any[] }) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [clientId, setClientId] = useState<number | "">("");
  const [projectId, setProjectId] = useState<number | "">("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  
  const [items, setItems] = useState([{ description: "", quantity: 1, unitPrice: 0 }]);

  const addItem = () => setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, val: any) => {
    const newItems = [...items];
    (newItems[idx] as any)[field] = val;
    setItems(newItems);
  };

  const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return alert("Please select a client.");
    if (items.length === 0) return alert("Add at least one line item.");
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: Number(clientId),
          projectId: projectId ? Number(projectId) : undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          notes,
          items,
        })
      });
      if (!res.ok) throw new Error("Failed to create invoice");
      const data = await res.json();
      if (data.success) {
        navigate(`/admin/invoices/${data.invoiceId}`);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to create invoice.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card border border-border p-6 rounded-xl shadow-sm">
        <div className="space-y-4">
          <h3 className="font-semibold border-b border-border pb-2 mb-4">Invoice Details</h3>
          
          <div>
            <label className="block text-sm font-medium mb-1.5">Client *</label>
            <select 
              required 
              value={clientId} 
              onChange={e => setClientId(e.target.value as any)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select a client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Project (Optional)</label>
            <select 
              value={projectId} 
              onChange={e => setProjectId(e.target.value as any)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">None</option>
              {projects.filter(p => !clientId || p.clientId === Number(clientId)).map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5">Due Date</label>
            <input 
              type="date" 
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold border-b border-border pb-2 mb-4">Line Items</h3>
          
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start bg-secondary/20 p-3 rounded-lg border border-border/50">
              <div className="flex-1 space-y-3">
                <input 
                  type="text" 
                  placeholder="Description" 
                  required
                  value={item.description}
                  onChange={e => updateItem(idx, 'description', e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm"
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Qty</label>
                    <input 
                      type="number" min="1" step="0.01" required
                      value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Price ($)</label>
                    <input 
                      type="number" min="0" step="0.01" required
                      value={item.unitPrice}
                      onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => removeItem(idx)}
                className="mt-1 p-1.5 text-muted-foreground hover:text-destructive rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button 
            type="button" 
            onClick={addItem}
            className="text-sm font-medium text-primary flex items-center gap-1 hover:underline"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
          
          <div className="border-t border-border pt-4 mt-4 flex justify-between items-center font-semibold text-lg">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
        <label className="block text-sm font-medium mb-1.5">Notes / Terms (Optional)</label>
        <textarea 
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Payment terms, bank details, etc..."
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        ></textarea>
      </div>

      <div className="flex justify-end">
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="btn-primary w-full sm:w-auto px-8"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Invoice"}
        </button>
      </div>
    </form>
  );
}
