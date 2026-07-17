import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { InvoiceForm } from "../../components/ui/InvoiceForm";

export default function AdminEditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const invoiceId = parseInt(id || "");
  
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isNaN(invoiceId)) {
      Promise.all([
        fetch('/api/clients').then(res => res.json()),
        fetch('/api/projects').then(res => res.json()),
        fetch(`/api/invoices/${invoiceId}`).then(res => res.ok ? res.json() : null)
      ])
      .then(([clientsData, projectsData, invData]) => {
        setClients(clientsData || []);
        setProjects(projectsData || []);
        setInvoiceData(invData);
      })
      .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [invoiceId]);

  if (isNaN(invoiceId) || (!isLoading && !invoiceData)) return <div className="p-6 text-destructive">Invoice not found</div>;
  if (isLoading) return <div className="p-6">Loading form data...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link to="/invoices" className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
          </Link>
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Edit Invoice {invoiceData?.invoice?.invoiceNumber}</h2>
        <p className="text-muted-foreground mt-1">Modify billing details for this invoice.</p>
      </div>

      <InvoiceForm 
        clients={clients} 
        projects={projects.map(p => ({ id: p.id, title: p.title, clientId: p.clientId }))} 
        initialData={invoiceData}
      />
    </div>
  );
}
