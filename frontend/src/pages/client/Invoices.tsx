import { useState, useEffect, useCallback } from 'react';
import { Receipt, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function ClientInvoicesPage() {
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & Search state
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchInvoices = useCallback(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    fetch(`/api/portal/client/invoices?${params.toString()}`)
      .then(res => res.json())
      .then(res => {
        if (res.data) {
          setInvoicesList(res.data);
          setTotal(res.total || 0);
        } else {
          setInvoicesList(res);
        }
      })
      .finally(() => setIsLoading(false));
  }, [status, page]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const totalPages = Math.ceil(total / limit) || 1;

  const statuses = [
    { label: 'All', value: '' },
    { label: 'Sent', value: 'sent' },
    { label: 'Paid', value: 'paid' },
    { label: 'Overdue', value: 'overdue' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
        <p className="text-muted-foreground mt-1">View and download your billing statements.</p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Invoice Number</th>
                <th className="px-6 py-4 font-medium">Project</th>
                <th className="px-6 py-4 font-medium">Issued Date</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
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
                      <p>You have no invoices yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoicesList.map(({ invoice, project }) => (
                  <tr key={invoice.id} className={`hover:bg-secondary/20 transition-colors ${invoice.status === 'overdue' ? 'bg-destructive/5' : ''}`}>
                    <td className="px-6 py-4 font-medium text-foreground">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4">{project?.title || "N/A"}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium">{invoice.currency || 'LKR'} {parseFloat(invoice.total).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                        invoice.status === 'sent' ? 'bg-blue-500/10 text-blue-500' :
                        invoice.status === 'overdue' ? 'bg-destructive/10 text-destructive' :
                        'bg-secondary text-muted-foreground'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/client/invoices/${invoice.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:bg-primary/10 px-3 py-1.5 rounded-md transition-colors">
                        View <Download className="w-3 h-3" />
                      </Link>
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
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
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
    </div>
  );
}
