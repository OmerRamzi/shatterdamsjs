import { useState, useEffect } from 'react';
import { FolderGit2, ArrowRight, Clock, CheckSquare, Phone, Mail, Building2, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function TeamDashboardPage() {
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [assignedContacts, setAssignedContacts] = useState<any[]>([]);
  const [assignedLeads, setAssignedLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [contactTab, setContactTab] = useState<'all' | 'contacts' | 'leads'>('all');

  useEffect(() => {
    Promise.all([
      fetch('/api/portal/team/projects').then(res => res.json()).catch(() => []),
      fetch('/api/portal/team/contacts').then(res => res.json()).catch(() => []),
      fetch('/api/portal/team/leads').then(res => res.json()).catch(() => []),
    ]).then(([projects, contacts, leads]) => {
      setProjectsData(Array.isArray(projects) ? projects : []);
      setAssignedContacts(Array.isArray(contacts) ? contacts : []);
      setAssignedLeads(Array.isArray(leads) ? leads : []);
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const activeProjects = projectsData.filter(p => p.project?.status !== 'completed');

  // Unified calling items list
  const allCallingItems = [
    ...assignedContacts.map(c => ({
      id: `contact-${c.id}`,
      type: 'contact',
      name: `${c.firstName} ${c.lastName || ''}`.trim(),
      company: c.companyName || 'Standalone Contact',
      phone: c.phone,
      email: c.email,
      badge: c.jobTitle || c.role?.replace('_', ' ') || 'Contact',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      notes: c.notes,
    })),
    ...assignedLeads.map(l => ({
      id: `lead-${l.id}`,
      type: 'lead',
      name: l.contactName || l.title,
      company: l.companyName || l.title,
      phone: l.phone,
      email: l.email,
      badge: l.status?.toUpperCase() || 'NEW LEAD',
      badgeColor: l.priority === 'hot' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200',
      notes: l.notes,
    })),
  ];

  const filteredCallingItems = allCallingItems.filter(item => {
    if (contactTab === 'contacts') return item.type === 'contact';
    if (contactTab === 'leads') return item.type === 'lead';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-1">
            Production Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 font-heading">
            Team Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Your active deliverables, scope tasks, and timesheets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/timesheets"
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs sm:text-sm shadow-xs transition-colors"
          >
            <Clock className="w-4 h-4" />
            <span>Log timesheet</span>
          </Link>
        </div>
      </div>

      {/* Assigned Contacts & Leads Calling Center */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center ring-1 ring-emerald-200/60">
                <Phone className="w-4 h-4 fill-emerald-600 text-transparent" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 font-heading">
                  My Assigned Leads & Contacts to Call
                </h3>
                <p className="text-xs text-slate-500">
                  Direct client outreach and sales discovery assigned to you
                </p>
              </div>
            </div>
          </div>

          {/* Type Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setContactTab('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                contactTab === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({allCallingItems.length})
            </button>
            <button
              onClick={() => setContactTab('contacts')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                contactTab === 'contacts' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Contacts ({assignedContacts.length})
            </button>
            <button
              onClick={() => setContactTab('leads')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                contactTab === 'leads' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Leads ({assignedLeads.length})
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="pt-4">
          {isLoading ? (
            <p className="text-xs text-slate-400 py-8 text-center font-semibold">Loading assigned calls...</p>
          ) : filteredCallingItems.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100 p-6">
              <UserCheck className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">No assigned contacts or leads right now</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                When an administrator or account lead assigns you a CRM lead or client contact to follow up with, they will appear here with 1-click calling links.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredCallingItems.map(item => (
                <div 
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-2xs transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 truncate">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate font-medium">{item.company}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider shrink-0 ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 my-2 bg-slate-50 p-2 rounded-lg border border-slate-100/80">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions / Call Button */}
                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    {item.email ? (
                      <a 
                        href={`mailto:${item.email}`}
                        className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5 truncate max-w-[140px]"
                        title={item.email}
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.email}</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No email</span>
                    )}

                    {item.phone ? (
                      <a
                        href={`tel:${item.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs shrink-0"
                        title={`Direct call to ${item.phone}`}
                      >
                        <Phone className="w-3 h-3 fill-white" />
                        <span>Call</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No phone</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Active Assignments Card */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2 font-heading">
                <FolderGit2 className="w-4 h-4 text-yellow-600" />
                <span>Active Assignments</span>
              </h3>
              <span className="text-xs font-medium text-slate-500">
                {isLoading ? '...' : `${activeProjects.length} projects`}
              </span>
            </div>

            <div className="space-y-2">
              {isLoading ? (
                <p className="text-xs text-slate-400 py-6 text-center">Loading assignments...</p>
              ) : activeProjects.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500">
                  You currently have no active project assignments.
                </div>
              ) : (
                activeProjects.slice(0, 5).map((p) => (
                  <div key={p.project?.id || Math.random()} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-colors">
                    <div className="min-w-0 pr-3">
                      <p className="font-medium text-xs sm:text-sm text-slate-900 truncate">{p.project?.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">{p.client?.companyName || 'Internal deliverable'}</p>
                    </div>
                    <Link 
                      to={`/projects/${p.project?.id}`} 
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
                      title="Open project"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {activeProjects.length > 5 && (
            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <Link to="/projects" className="text-xs font-semibold text-yellow-600 hover:text-yellow-700">
                View all active projects
              </Link>
            </div>
          )}
        </div>

        {/* Quick Tools & Guidelines */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2 font-heading">
                <CheckSquare className="w-4 h-4 text-yellow-600" />
                <span>Quick Production Links</span>
              </h3>
            </div>

            <div className="space-y-2.5">
              <Link 
                to="/timesheets" 
                className="block p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <p className="font-semibold text-xs sm:text-sm text-slate-900">Weekly Timesheets</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Submit daily work logs, billable hours, and notes.</p>
              </Link>

              <Link 
                to="/projects" 
                className="block p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <p className="font-semibold text-xs sm:text-sm text-slate-900">Deliverables & Asset Reviews</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Review client feedback, comments, and approved assets.</p>
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
            <span>Shatter DAMS — Creative Production & Asset Ops</span>
          </div>
        </div>
      </div>
    </div>
  );
}
