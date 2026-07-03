import { Receipt } from "lucide-react";

export default function ClientInvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
        <p className="text-muted-foreground mt-1">View and manage your billing.</p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-12 text-center text-muted-foreground">
          <Receipt className="w-10 h-10 mx-auto opacity-20 mb-3" />
          <p>No invoices available yet.</p>
        </div>
      </div>
    </div>
  );
}
