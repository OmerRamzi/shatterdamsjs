import { getClientInvoices } from "@/app/actions/portal";
import { Receipt, Download } from "lucide-react";
import Link from "next/link";

export default async function ClientInvoicesPage() {
  const invoicesList = await getClientInvoices();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
        <p className="text-muted-foreground mt-1">View and download your billing statements.</p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
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
              {invoicesList.length === 0 ? (
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
                  <tr key={invoice.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4">{project?.title || "N/A"}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {invoice.createdAt?.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium">${parseFloat(invoice.total!).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                        invoice.status === 'sent' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-secondary text-muted-foreground'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* For now, we will redirect them to a detailed view if they want to download the PDF, or just implement the view. */}
                      <Link href={`/client/invoices/${invoice.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:bg-primary/10 px-3 py-1.5 rounded-md transition-colors">
                        View <Download className="w-3 h-3" />
                      </Link>
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

