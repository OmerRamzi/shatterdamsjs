import { getQuotes } from "@/app/actions/quotes";
import { Plus, Search, FileText } from "lucide-react";
import Link from "next/link";

export default async function AdminQuotesPage() {
  const quotesList = await getQuotes();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quotations</h2>
          <p className="text-muted-foreground mt-1">Manage pricing quotes and estimates.</p>
        </div>
        <Link href="/admin/quotes/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Quote
        </Link>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search quotes..."
              className="w-full bg-secondary/50 border-none rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quotesList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-8 h-8 mb-2 opacity-50" />
                      <p>No quotes found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                quotesList.map(({ quote, client }) => (
                  <tr key={quote.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      {quote.quoteNumber}
                    </td>
                    <td className="px-6 py-4">
                      {client?.companyName || "Unknown Client"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {quote.createdAt?.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium">${parseFloat(quote.total!).toFixed(2)}</td>
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

