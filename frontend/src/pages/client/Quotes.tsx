import { useState, useEffect, useCallback } from 'react';
import { FileText, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function ClientQuotesPage() {
  const [quotesList, setQuotesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & Search state
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchQuotes = useCallback(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    fetch(`/api/portal/client/quotes?${params.toString()}`)
      .then(res => res.json())
      .then(res => {
        if (res.data) {
          setQuotesList(res.data);
          setTotal(res.total || 0);
        } else {
          setQuotesList(res);
        }
      })
      .finally(() => setIsLoading(false));
  }, [status, page]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const totalPages = Math.ceil(total / limit) || 1;

  const statuses = [
    { label: 'All', value: '' },
    { label: 'Sent', value: 'sent' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Rejected', value: 'rejected' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Quotations</h2>
        <p className="text-muted-foreground mt-1">Review and approve your project estimates.</p>
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
                <th className="px-6 py-4 font-medium">Quote Number</th>
                <th className="px-6 py-4 font-medium">Project</th>
                <th className="px-6 py-4 font-medium">Issued Date</th>
                <th className="px-6 py-4 font-medium">Estimated Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Loading quotes...
                  </td>
                </tr>
              ) : quotesList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-8 h-8 mb-2 opacity-50" />
                      <p>You have no quotations yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                quotesList.map(({ quote, project }) => (
                  <tr key={quote.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      {quote.quoteNumber}
                    </td>
                    <td className="px-6 py-4">{project?.title || "N/A"}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(quote.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium">{quote.currency || 'LKR'} {parseFloat(quote.total).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        quote.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-500' :
                        quote.status === 'sent' ? 'bg-blue-500/10 text-blue-500' :
                        quote.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                        'bg-secondary text-muted-foreground'
                      }`}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/client/quotes/${quote.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:bg-primary/10 px-3 py-1.5 rounded-md transition-colors">
                        Review <ArrowRight className="w-3 h-3" />
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
