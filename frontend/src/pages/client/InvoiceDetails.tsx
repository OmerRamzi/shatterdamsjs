import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Receipt, CheckCircle } from "lucide-react";
import { InvoicePDFGenerator } from "../../components/ui/InvoicePDFGenerator";

export default function ClientInvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const invoiceId = parseInt(id || "");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Settings placeholder for Phase 3 (Will wire in Phase 8)
  const settings = {
    companyName: "Shatter Agency (Configurable)",
    currency: data?.invoice?.currency || "LKR"
  };

  const fetchInvoice = () => {
    fetch(`/api/portal/client/invoices/${invoiceId}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!isNaN(invoiceId)) {
      fetchInvoice();
    }
  }, [invoiceId]);

  if (isNaN(invoiceId)) return <div className="p-6 text-destructive">Invalid Invoice ID</div>;
  if (isLoading) return <div className="p-6">Loading invoice details...</div>;
  if (!data) return <div className="p-6 text-destructive">Invoice not found.</div>;

  const { invoice, client, items, logs = [], proofs = [] } = data;

  const paymentLogs = logs.filter((l: any) => l.action.toLowerCase().includes('payment'));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link to="/client/invoices" className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Invoice {invoice.invoiceNumber}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                invoice.status === 'sent' ? 'bg-blue-500/10 text-blue-500' :
                invoice.status === 'overdue' ? 'bg-destructive/10 text-destructive' :
                invoice.status === 'cancelled' ? 'bg-destructive/10 text-destructive' :
                'bg-secondary text-muted-foreground'
              }`}>
                {invoice.status}
              </span>
              <span className="text-sm text-muted-foreground">
                Issued: {new Date(invoice.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <InvoicePDFGenerator data={data} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Invoice Document View */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-lg p-8 sm:p-12 relative overflow-hidden">
            
            {/* Watermark */}
            {invoice.status === 'paid' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-[0.03] pointer-events-none">
                <span className="text-9xl font-black uppercase text-emerald-500">PAID</span>
              </div>
            )}
            {invoice.status === 'overdue' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-[0.03] pointer-events-none">
                <span className="text-9xl font-black uppercase text-destructive">OVERDUE</span>
              </div>
            )}
            {invoice.status === 'draft' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-[0.03] pointer-events-none">
                <span className="text-9xl font-black uppercase text-muted-foreground">DRAFT</span>
              </div>
            )}

            <div className="flex justify-between items-start mb-12 relative z-10">
              <div>
                <h1 className="text-4xl font-black text-primary tracking-tight">INVOICE</h1>
                <p className="text-muted-foreground font-medium mt-1">{invoice.invoiceNumber}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-foreground">{settings.companyName}</p>
                <p className="text-muted-foreground mt-1">contact@meetshatter.com</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-12 border-y border-border/50 py-6 relative z-10">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Billed To</p>
                <p className="font-semibold text-foreground text-lg">{client?.companyName}</p>
                {client?.contactPerson && <p className="text-muted-foreground text-sm mt-1">{client.contactPerson}</p>}
                {client?.email && <p className="text-muted-foreground text-sm">{client.email}</p>}
                {client?.address && <p className="text-muted-foreground text-sm mt-1">{client.address}</p>}
              </div>
              <div className="text-right">
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Date Issued</p>
                  <p className="font-medium text-sm">{new Date(invoice.createdAt).toLocaleDateString()}</p>
                </div>
                {invoice.dueDate && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Due Date</p>
                    <p className="font-medium text-sm">{new Date(invoice.dueDate).toLocaleDateString()}</p>
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
                  <span>{settings.currency} {parseFloat(invoice.subtotal).toFixed(2)}</span>
                </div>
                {parseFloat(invoice.tax) > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax</span>
                    <span>{settings.currency} {parseFloat(invoice.tax).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(invoice.discount) > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Discount</span>
                    <span>-{settings.currency} {parseFloat(invoice.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-foreground pt-3 border-t border-border">
                  <span>Total</span>
                  <span>{settings.currency} {parseFloat(invoice.total).toFixed(2)}</span>
                </div>
                {parseFloat(invoice.paidAmount) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-500 font-medium">
                    <span>Amount Paid</span>
                    <span>-{settings.currency} {parseFloat(invoice.paidAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold text-foreground pt-3 border-t border-border">
                  <span>Balance Due</span>
                  <span>{settings.currency} {(parseFloat(invoice.total) - parseFloat(invoice.paidAmount || '0')).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {invoice.notes && (
              <div className="mt-16 pt-6 border-t border-border/50 text-sm text-muted-foreground relative z-10">
                <p className="font-semibold text-foreground mb-2">Notes / Terms</p>
                <p className="whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar panels */}
        <div className="space-y-6">
          {/* Payment History */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> Payment History
            </h3>
            
            {paymentLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No payments recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {paymentLogs.map((log: any) => (
                  <div key={log.id} className="text-sm">
                    <p className="font-medium text-emerald-600 dark:text-emerald-400">{log.action}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}

            {proofs.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Payment Proofs</h4>
                <div className="space-y-2">
                  {proofs.map((proof: any) => (
                    <div key={proof.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border/50 text-sm">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Receipt className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate text-xs">{proof.fileName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
