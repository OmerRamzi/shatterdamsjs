import { useState, useEffect, useCallback } from 'react';
import { 
  BookUser, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Building2, 
  ExternalLink, 
  Star, 
  Pencil, 
  Trash2,
  FileSpreadsheet
} from 'lucide-react';
import { ContactModal } from '../../../components/admin/crm/ContactModal';
import { CsvImportModal } from '../../../components/admin/crm/CsvImportModal';

interface Contact {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  role: 'decision_maker' | 'influencer' | 'billing' | 'technical' | 'primary' | 'other';
  isPrimary: boolean;
  clientId: number | null;
  companyName?: string | null;
  linkedinUrl: string | null;
  notes: string | null;
  createdAt: string;
}

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Contact Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/crm/contacts');
      if (res.ok) setContacts(await res.json());
    } catch (err) {
      console.error('Fetch contacts error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      const res = await fetch(`/api/crm/contacts/${id}`, { method: 'DELETE' });
      if (res.ok) fetchContacts();
    } catch (err) {
      console.error('Delete contact error:', err);
    }
  };

  const handleOpenAdd = () => {
    setSelectedContact(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setIsModalOpen(true);
  };

  const filteredContacts = contacts.filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const fullName = `${c.firstName} ${c.lastName || ''}`.toLowerCase();
    return (
      fullName.includes(term) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.companyName && c.companyName.toLowerCase().includes(term)) ||
      (c.jobTitle && c.jobTitle.toLowerCase().includes(term))
    );
  });

  const getRoleBadge = (role: Contact['role']) => {
    switch (role) {
      case 'decision_maker':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 font-bold px-2 py-0.5 rounded-full text-[10px]">Decision Maker</span>;
      case 'primary':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded-full text-[10px]">Primary Contact</span>;
      case 'billing':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-full text-[10px]">Billing / Accounts</span>;
      case 'technical':
        return <span className="bg-sky-100 text-sky-800 border border-sky-200 font-bold px-2 py-0.5 rounded-full text-[10px]">Technical Lead</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 font-bold px-2 py-0.5 rounded-full text-[10px] capitalize">{role?.replace('_', ' ')}</span>;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>CRM Stakeholders & People</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Contacts Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Stakeholder records, decision makers, and communication logs across client accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs sm:text-sm transition-all shadow-xs"
            title="Import contacts from Zoho CRM or CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-xs hover:shadow transition-all text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, company, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500">
          {filteredContacts.length} contacts registered
        </div>
      </div>

      {/* Contacts Grid */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-400 font-semibold text-sm">
          Loading contacts directory...
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400">
          <BookUser className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 text-sm">No contacts found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Add key client stakeholders or sync contacts from leads to build your communication database.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map(contact => {
            const fullName = `${contact.firstName} ${contact.lastName || ''}`.trim();
            const initials = `${contact.firstName[0]}${contact.lastName ? contact.lastName[0] : ''}`.toUpperCase();

            return (
              <div
                key={contact.id}
                className="group bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Avatar & Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-slate-900 text-amber-400 font-black text-sm flex items-center justify-center shrink-0 shadow-inner">
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 
                            onClick={() => handleOpenEdit(contact)}
                            className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-amber-600 transition-colors cursor-pointer"
                          >
                            {fullName}
                          </h4>
                          {contact.isPrimary && (
                            <span title="Primary Contact">
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            </span>
                          )}
                        </div>
                        {contact.jobTitle && (
                          <p className="text-xs text-slate-500">{contact.jobTitle}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(contact)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700"
                        title="Edit Contact"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600"
                        title="Delete Contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Company */}
                  {contact.companyName && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold mb-3 pb-3 border-b border-slate-100">
                      <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{contact.companyName}</span>
                    </div>
                  )}

                  {/* Contact channels */}
                  <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                    {contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a href={`mailto:${contact.email}`} className="truncate hover:text-amber-600 hover:underline">
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a href={`tel:${contact.phone}`} className="hover:text-amber-600">
                          {contact.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom footer: Role badge & LinkedIn */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <div>{getRoleBadge(contact.role)}</div>

                  {contact.linkedinUrl && (
                    <a
                      href={contact.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                      title="LinkedIn Profile"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contact Modal */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          setIsModalOpen(false);
          fetchContacts();
        }}
        contact={selectedContact}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportComplete={() => {
          fetchContacts();
        }}
        defaultType="contacts"
      />
    </div>
  );
}
