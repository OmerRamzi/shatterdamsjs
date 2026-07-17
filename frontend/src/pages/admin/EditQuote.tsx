import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { QuoteForm } from "../../components/ui/QuoteForm";

export default function AdminEditQuotePage() {
  const { id } = useParams<{ id: string }>();
  const quoteId = parseInt(id || "");
  
  const [clients, setClients] = useState<any[]>([]);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isNaN(quoteId)) {
      Promise.all([
        fetch('/api/clients').then(res => res.json()),
        fetch(`/api/quotes/${quoteId}`).then(res => res.ok ? res.json() : null)
      ])
      .then(([clientsData, qData]) => {
        setClients(clientsData || []);
        setQuoteData(qData);
      })
      .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [quoteId]);

  if (isNaN(quoteId) || (!isLoading && !quoteData)) return <div className="p-6 text-destructive">Quote not found</div>;
  if (isLoading) return <div className="p-6">Loading form data...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link to="/quotes" className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Quotes
          </Link>
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Edit Quote {quoteData?.quote?.quoteNumber}</h2>
        <p className="text-muted-foreground mt-1">Modify pricing and details for this quotation.</p>
      </div>

      <QuoteForm 
        clients={clients} 
        initialData={quoteData}
      />
    </div>
  );
}
