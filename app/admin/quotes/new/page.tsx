import { QuoteForm } from "@/components/ui/QuoteForm";
import { getClients } from "@/app/actions/clients";
import { getProjects } from "@/app/actions/projects";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function AdminNewQuotePage() {
  const [clients, projects] = await Promise.all([
    getClients(),
    getProjects()
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/admin/quotes" className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Quotes
          </Link>
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Create Quotation</h2>
        <p className="text-muted-foreground mt-1">Generate a new price quote for a client.</p>
      </div>

      <QuoteForm 
        clients={clients} 
        projects={projects.map(p => ({ id: p.project.id, title: p.project.title, clientId: p.project.clientId }))} 
      />
    </div>
  );
}
