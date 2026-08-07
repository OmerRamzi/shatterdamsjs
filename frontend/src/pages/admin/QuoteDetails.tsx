import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, FileText } from "lucide-react";
import { QuoteActions } from "../../components/ui/QuoteActions";
import { QuotePDFGenerator } from "../../components/ui/QuotePDFGenerator";

export default function AdminQuoteDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const quoteId = parseInt(id || "");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Settings placeholder for Phase 4 (Will wire in Phase 8)
  const settings = {
    companyName: "Shatter Agency (Configurable)",
    currency: data?.quote?.currency || "LKR"
  };

  const fetchQuote = () => {
    fetch(`/api/quotes/${quoteId}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!isNaN(quoteId)) {
      fetchQuote();
    }
  }, [quoteId]);

  if (isNaN(quoteId)) return <div className="p-6 text-destructive">Invalid Quote ID</div>;
  if (isLoading) return <div className="p-6">Loading quote details...</div>;
  if (!data) return <div className="p-6 text-destructive">Quote not found.</div>;

  const { quote, client, items, project } = data;

  const getExpiryText = () => {
    if (!quote.validUntil) return null;
    const expiry = new Date(quote.validUntil);
    const today = new Date();
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return <span className="text-destructive font-medium">Expired {Math.abs(diff)} days ago</span>;
    if (diff === 0) return <span className="text-orange-500 font-medium">Expires today</span>;
    return <span className="text-muted-foreground">Expires in {diff} days</span>;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link to="/quotes" className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Quotes
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Quote {quote.quoteNumber}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                quote.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-500' :
                quote.status === 'sent' ? 'bg-blue-500/10 text-blue-500' :
                quote.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                quote.status === 'expired' ? 'bg-orange-500/10 text-orange-500' :
                'bg-secondary text-muted-foreground'
              }`}>
                {quote.status}
              </span>
              <span className="text-sm text-muted-foreground">
                Issued: {new Date(quote.createdAt).toLocaleDateString()}
              </span>
              
              {quote.convertedToInvoiceId && (
                <Link to={`/admin/invoices/${quote.convertedToInvoiceId}`} className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full hover:bg-emerald-500/20 transition-colors">
                  <FileText className="w-3.5 h-3.5" /> Converted to Invoice
                </Link>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <QuotePDFGenerator data={data} />
            <QuoteActions 
              quoteId={quote.id} 
              currentStatus={quote.status} 
              convertedToInvoiceId={quote.convertedToInvoiceId}
              onStatusUpdate={fetchQuote} 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-lg p-8 sm:p-12 relative overflow-hidden">
            
            {/* Watermark */}
            {quote.status !== 'sent' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-[0.03] pointer-events-none">
                <span className="text-9xl font-black uppercase text-foreground">{quote.status}</span>
              </div>
            )}

            <div className="flex justify-between items-start mb-12 relative z-10">
              <div>
                <h1 className="text-4xl font-black text-primary tracking-tight">QUOTATION</h1>
                <p className="text-muted-foreground font-medium mt-1">{quote.quoteNumber}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-foreground">{settings.companyName}</p>
                <p className="text-muted-foreground mt-1">contact@meetshatter.com</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-12 border-y border-border/50 py-6 relative z-10">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Prepared For</p>
                <p className="font-semibold text-foreground text-lg">{client?.companyName}</p>
                {client?.contactPerson && <p className="text-muted-foreground text-sm mt-1">{client.contactPerson}</p>}
                {client?.email && <p className="text-muted-foreground text-sm">{client.email}</p>}
                {client?.address && <p className="text-muted-foreground text-sm mt-1">{client.address}</p>}
              </div>
              <div className="text-right">
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Date Issued</p>
                  <p className="font-medium text-sm">{new Date(quote.createdAt).toLocaleDateString()}</p>
                </div>
                {quote.validUntil && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Valid Until</p>
                    <p className="font-medium text-sm flex items-center justify-end gap-2">
                      {new Date(quote.validUntil).toLocaleDateString()}
                    </p>
                    <div className="mt-1 text-xs">{getExpiryText()}</div>
                  </div>
                )}
              </div>
            </div>

            <table className="w-full text-sm text-left mb-8 relative z-10">
              <thead className="text-xs text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium text-center">Qty</th>
                  <th className="pb-3 font-medium text-right">Unit Price</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-4 font-medium text-foreground">{item.description}</td>
                    <td className="py-4 text-center text-muted-foreground">{item.quantity}</td>
                    <td className="py-4 text-right text-muted-foreground">{settings.currency} {parseFloat(item.unitPrice).toFixed(2)}</td>
                    <td className="py-4 text-right font-medium text-foreground">{settings.currency} {parseFloat(item.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-6 relative z-10">
              <div className="w-64 space-y-3">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{settings.currency} {parseFloat(quote.subtotal).toFixed(2)}</span>
                </div>
                {parseFloat(quote.tax || '0') > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax</span>
                    <span>{settings.currency} {parseFloat(quote.tax).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(quote.discount || '0') > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Discount</span>
                    <span>-{settings.currency} {parseFloat(quote.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-foreground pt-3 border-t border-border">
                  <span>Total</span>
                  <span>{settings.currency} {parseFloat(quote.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {quote.notes && (
              <div className="mt-16 pt-6 border-t border-border/50 text-sm text-muted-foreground relative z-10">
                <p className="font-semibold text-foreground mb-2">Notes / Terms</p>
                <p className="whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-primary" /> Details
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{quote.status}</span>
              </div>
              {project && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project</span>
                  <span className="font-medium text-right">{project.title}</span>
                </div>
              )}
              {quote.convertedToInvoiceId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Converted</span>
                  <Link to={`/admin/invoices/${quote.convertedToInvoiceId}`} className="text-emerald-600 hover:underline">
                    View Invoice
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
