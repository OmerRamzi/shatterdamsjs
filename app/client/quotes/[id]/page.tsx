import { getQuoteDetails } from "@/app/actions/quotes";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuotePDFGenerator } from "@/components/ui/QuotePDFGenerator";
import { ClientQuoteAction } from "@/components/ui/ClientQuoteAction";

export default async function ClientQuoteDetailsPage({ params }: { params: { id: string } }) {
  const quoteId = parseInt(params.id);
  if (isNaN(quoteId)) notFound();

  try {
    const data = await getQuoteDetails(quoteId);
    const { quote, client, items } = data;

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/client/quotes" className="hover:text-foreground flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Quotes
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Quotation {quote.quoteNumber}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  quote.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-500' :
                  quote.status === 'sent' ? 'bg-blue-500/10 text-blue-500' :
                  quote.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                  'bg-secondary text-muted-foreground'
                }`}>
                  {quote.status}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <QuotePDFGenerator data={data} />
              <ClientQuoteAction quoteId={quote.id} currentStatus={quote.status!} />
            </div>
          </div>
        </div>

        {/* Quote Preview */}
        <div className="bg-card border border-border rounded-xl shadow-lg p-8 sm:p-12 mt-8">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-4xl font-black text-primary tracking-tight">QUOTATION</h1>
              <p className="text-muted-foreground font-medium mt-1">{quote.quoteNumber}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold text-foreground">Shatter Agency</p>
              <p className="text-muted-foreground mt-1">contact@meetshatter.com</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12 border-y border-border/50 py-6">
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
                <p className="font-medium text-sm">{quote.createdAt.toLocaleDateString()}</p>
              </div>
              {quote.validUntil && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Valid Until</p>
                  <p className="font-medium text-sm">{new Date(quote.validUntil).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>

          <table className="w-full text-sm text-left mb-8">
            <thead className="text-xs text-muted-foreground uppercase border-b border-border">
              <tr>
                <th className="pb-3 font-medium">Description</th>
                <th className="pb-3 font-medium text-center">Qty</th>
                <th className="pb-3 font-medium text-right">Unit Price</th>
                <th className="pb-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-4 font-medium text-foreground">{item.description}</td>
                  <td className="py-4 text-center text-muted-foreground">{item.quantity}</td>
                  <td className="py-4 text-right text-muted-foreground">${parseFloat(item.unitPrice!).toFixed(2)}</td>
                  <td className="py-4 text-right font-medium text-foreground">${parseFloat(item.total!).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end pt-6">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>${parseFloat(quote.subtotal!).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-foreground pt-3 border-t border-border">
                <span>Total Estimated</span>
                <span>${parseFloat(quote.total!).toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {quote.notes && (
            <div className="mt-16 pt-6 border-t border-border/50 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-2">Notes / Terms</p>
              <p className="whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
