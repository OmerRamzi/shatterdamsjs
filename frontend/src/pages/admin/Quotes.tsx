import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, FileText, Pencil, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminQuotesPage() {
  const [quotesList, setQuotesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & Search state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchQuotes = useCallback(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    fetch(`/api/quotes?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(res => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setQuotesList(list);
        setTotal(typeof res?.total === 'number' ? res.total : list.length);
      })
      .catch(err => {
        console.error("Failed to load quotes:", err);
        setQuotesList([]);
        setTotal(0);
      })
      .finally(() => setIsLoading(false));
  }, [search, status, page]);

  useEffect(() => {
    const delay = setTimeout(() => fetchQuotes(), 300);
    return () => clearTimeout(delay);
  }, [fetchQuotes]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this quote? This cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchQuotes();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete quote');
      }
    } catch (error) {
      alert('Error deleting quote');
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const statuses = [
    { label: 'All', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Sent', value: 'sent' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Expired', value: 'expired' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quotations</h2>
          <p className="text-muted-foreground mt-1">Manage pricing quotes and estimates.</p>
        </div>
        <Link to="/quotes/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Quote
        </Link>
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
            
            <div className="relative flex-1 max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search quotes..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full bg-secondary/50 border-none rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Quote Number</th>
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
                    Loading quotes...
                  </td>
                </tr>
              ) : quotesList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-8 h-8 mb-2 opacity-50" />
                      <p>No quotes found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                Array.isArray(quotesList) && quotesList.map(({ quote, client }: any) => {
                  if (!quote) return null;
                  return (
                    <tr key={quote.id} className="hover:bg-secondary/20 transition-colors group">
                      <td className="px-6 py-4 font-medium text-foreground">
                        <Link to={`/quotes/${quote.id}`} className="hover:text-primary transition-colors">
                          {quote.quoteNumber}
                        </Link>
                    </td>
                    <td className="px-6 py-4">
                      {client?.companyName || "Unknown Client"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(quote.issueDate || quote.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium">{quote.currency || 'LKR'} {parseFloat(quote.total).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        quote.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-500' :
                        quote.status === 'sent' ? 'bg-blue-500/10 text-blue-500' :
                        quote.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                        quote.status === 'expired' ? 'bg-destructive/10 text-destructive' :
                        'bg-secondary text-muted-foreground'
                      }`}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link 
                          to={`/quotes/${quote.id}`}
                          className="text-muted-foreground hover:text-primary p-1.5 rounded hover:bg-secondary transition-colors"
                          title="View Quote"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link 
                          to={`/quotes/${quote.id}/edit`}
                          className="text-muted-foreground hover:text-primary p-1.5 rounded hover:bg-secondary transition-colors"
                          title="Edit Quote"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(quote.id)}
                          className="text-muted-foreground hover:text-destructive p-1.5 rounded hover:bg-destructive/10 transition-colors"
                          title="Delete Quote"
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
    </div>
  );
}
