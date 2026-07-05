import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Building2, User, Mail, Phone, MapPin, Pencil, CheckCircle2, Plus, Eye } from "lucide-react";
import { ClientModal } from "../../components/admin/ClientModal";

export default function AdminClientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id || "");

  const [client, setClient] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'invoices' | 'quotes'>('overview');
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [clientRes, projectsRes, invoicesRes, quotesRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/projects?clientId=${clientId}`),
        fetch(`/api/invoices?clientId=${clientId}`),
        fetch(`/api/quotes?clientId=${clientId}`)
      ]);
      
      if (clientRes.ok) setClient(await clientRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (invoicesRes.ok) setInvoices(await invoicesRes.json());
      if (quotesRes.ok) setQuotes(await quotesRes.json());
    } catch (error) {
      console.error("Error fetching client data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isNaN(clientId)) {
      fetchData();
    }
  }, [clientId]);

  if (isNaN(clientId) || (!isLoading && !client)) return <div className="p-6 text-destructive">Client not found</div>;
  if (isLoading) return <div className="p-6">Loading client details...</div>;

  const totalBilled = invoices.reduce((sum, inv) => sum + (parseFloat(inv.invoice.total) || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (parseFloat(inv.invoice.paidAmount) || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link to="/admin/clients" className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Clients
          </Link>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
              {client.companyName.charAt(0)}
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{client.companyName}</h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {client.contactPerson || 'No contact specified'}</span>
                {client.status === 'active' ? (
                  <span className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3.5 h-3.5" /> Active Portal</span>
                ) : (
                  <span className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">Inactive</span>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" /> Edit Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <p className="text-sm text-muted-foreground">Total Projects</p>
          <p className="text-2xl font-bold mt-1">{projects.length}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <p className="text-sm text-muted-foreground">Total Invoices</p>
          <p className="text-2xl font-bold mt-1">{invoices.length}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <p className="text-sm text-muted-foreground">Total Billed</p>
          <p className="text-2xl font-bold mt-1">${totalBilled.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <p className="text-sm text-muted-foreground">Total Paid</p>
          <p className="text-2xl font-bold mt-1 text-emerald-500">${totalPaid.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {['overview', 'projects', 'invoices', 'quotes'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab 
                  ? 'border-primary text-primary bg-primary/5' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="max-w-2xl space-y-6">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Client Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5"><Building2 className="w-4 h-4" /> Company Name</p>
                  <p className="font-medium">{client.companyName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5"><User className="w-4 h-4" /> Contact Person</p>
                  <p className="font-medium">{client.contactPerson || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5"><Mail className="w-4 h-4" /> Email Address</p>
                  <a href={`mailto:${client.email}`} className="font-medium text-primary hover:underline">{client.email}</a>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5"><Phone className="w-4 h-4" /> Phone Number</p>
                  <a href={`tel:${client.phone}`} className="font-medium text-primary hover:underline">{client.phone || '-' }</a>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Address</p>
                  <p className="font-medium">
                    {client.address ? (
                      <>
                        {client.address}<br/>
                        {client.city && `${client.city}, `}{client.country}
                      </>
                    ) : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Projects</h3>
                <Link to="/admin/projects" className="btn-primary flex items-center gap-2 text-sm py-1.5">
                   Go to Projects
                </Link>
              </div>
              {projects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-secondary/20 rounded-lg border border-border border-dashed">
                  No projects found for this client.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map(project => (
                    <Link key={project.id} to={`/admin/projects/${project.id}`} className="block group">
                      <div className="bg-card border border-border p-4 rounded-xl shadow-sm hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium group-hover:text-primary transition-colors">{project.title}</h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">
                            {project.status?.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
                        <div className="flex justify-between text-xs text-muted-foreground border-t border-border pt-3">
                          <span>Budget: ${project.budget || '0'}</span>
                          <span>Due: {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Invoices</h3>
                <Link to="/admin/invoices/new" className="btn-primary flex items-center gap-2 text-sm py-1.5">
                   <Plus className="w-3.5 h-3.5" /> Create Invoice
                </Link>
              </div>
              {invoices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-secondary/20 rounded-lg border border-border border-dashed">
                  No invoices found for this client.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-medium">Invoice Number</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {invoices.map(({ invoice }) => (
                        <tr key={invoice.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">
                            <Link to={`/admin/invoices/${invoice.id}`} className="hover:text-primary transition-colors">
                              {invoice.invoiceNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{new Date(invoice.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-medium">${parseFloat(invoice.total).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                              invoice.status === 'sent' ? 'bg-blue-500/10 text-blue-500' :
                              'bg-yellow-500/10 text-yellow-500'
                            }`}>
                              {invoice.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                             <Link 
                              to={`/admin/invoices/${invoice.id}`}
                              className="text-muted-foreground hover:text-primary p-1 rounded hover:bg-secondary transition-colors inline-block"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'quotes' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Quotations</h3>
                <Link to="/admin/quotes/new" className="btn-primary flex items-center gap-2 text-sm py-1.5">
                   <Plus className="w-3.5 h-3.5" /> Create Quote
                </Link>
              </div>
              {quotes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-secondary/20 rounded-lg border border-border border-dashed">
                  No quotes found for this client.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-medium">Quote Number</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {quotes.map(({ quote }) => (
                        <tr key={quote.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">
                            <Link to={`/admin/quotes/${quote.id}`} className="hover:text-primary transition-colors">
                              {quote.quoteNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{new Date(quote.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-medium">${parseFloat(quote.total).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              quote.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-500' :
                              quote.status === 'sent' ? 'bg-blue-500/10 text-blue-500' :
                              quote.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                              'bg-secondary text-muted-foreground'
                            }`}>
                              {quote.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                             <Link 
                              to={`/admin/quotes/${quote.id}`}
                              className="text-muted-foreground hover:text-primary p-1 rounded hover:bg-secondary transition-colors inline-block"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <ClientModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSaved={fetchData}
        client={client}
      />
    </div>
  );
}
