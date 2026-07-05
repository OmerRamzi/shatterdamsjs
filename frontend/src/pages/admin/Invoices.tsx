import { useState, useEffect } from 'react';
import { Plus, Search, Receipt, Pencil, Trash2, Eye } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminInvoicesPage() {
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoices = () => {
    setIsLoading(true);
    fetch('/api/invoices')
      .then(res => res.json())
      .then(data => setInvoicesList(data))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invoice? This cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInvoices();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete invoice');
      }
    } catch (error) {
      alert('Error deleting invoice');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground mt-1">Manage and track all client billing.</p>
        </div>
        <Link to="/admin/invoices/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Invoice
        </Link>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search invoices..."
              className="w-full bg-secondary/50 border-none rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Invoice Number</th>
                <th className="px-6 py-4 font-medium">Client</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoicesList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Receipt className="w-8 h-8 mb-2 opacity-50" />
                      <p>No invoices found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoicesList.map(({ invoice, client }) => (
                  <tr key={invoice.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-6 py-4 font-medium">
                      <Link to={`/admin/invoices/${invoice.id}`} className="hover:text-primary transition-colors">
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">{client?.companyName}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium">${parseFloat(invoice.total).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                        invoice.status === 'sent' ? 'bg-blue-500/10 text-blue-500' :
                        invoice.status === 'cancelled' ? 'bg-destructive/10 text-destructive' :
                        'bg-secondary text-muted-foreground'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link 
                          to={`/admin/invoices/${invoice.id}`}
                          className="text-muted-foreground hover:text-primary p-1.5 rounded hover:bg-secondary transition-colors"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link 
                          to={`/admin/invoices/${invoice.id}/edit`}
                          className="text-muted-foreground hover:text-primary p-1.5 rounded hover:bg-secondary transition-colors"
                          title="Edit Invoice"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(invoice.id)}
                          className="text-muted-foreground hover:text-destructive p-1.5 rounded hover:bg-destructive/10 transition-colors"
                          title="Delete Invoice"
                        >
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
      </div>
    </div>
  );
}
