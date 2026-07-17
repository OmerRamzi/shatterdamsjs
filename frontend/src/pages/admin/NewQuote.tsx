import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { QuoteForm } from "../../components/ui/QuoteForm";

export default function AdminNewQuotePage() {
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(res => res.json()),
      fetch('/api/projects').then(res => res.json())
    ])
    .then(([clientsData, projectsData]) => {
      setClients(clientsData || []);
      setProjects(projectsData || []);
    })
    .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="p-6">Loading form data...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link to="/quotes" className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Quotes
          </Link>
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Create Quotation</h2>
        <p className="text-muted-foreground mt-1">Generate a new quote for a client.</p>
      </div>

      <QuoteForm 
        clients={clients} 
        projects={projects.map(p => ({ id: p.id, title: p.title, clientId: p.clientId }))} 
      />
    </div>
  );
}
