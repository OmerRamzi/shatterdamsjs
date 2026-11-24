import { useState, useEffect } from 'react';
import { Search, FileText, Receipt, Folder } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from '../../context/AuthContext';

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState({ activeProjects: [], recentFiles: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/client/dashboard')
      .then(res => res.json())
      .then(resData => {
        if (!resData.error) {
          setData(resData);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-1">
            Client Portal Overview
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 font-heading">
            Welcome back, {user?.name || 'Client'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review production deliverables, download assets, and manage invoices.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search deliverables, invoices..." 
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-shadow"
          />
        </div>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Files & Proofs */}
        <Link 
          to="/projects" 
          className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors group flex items-start justify-between"
        >
          <div>
            <div className="w-9 h-9 bg-[#101216] rounded-lg flex items-center justify-center text-yellow-400 mb-3">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-slate-900 group-hover:text-yellow-600 transition-colors">Deliverables & Proofs</h3>
            <p className="text-xs text-slate-500 mt-0.5">Access files, revisions, and media assets</p>
          </div>
        </Link>

        {/* Invoices & Quotes */}
        <Link 
          to="/invoices" 
          className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors group flex items-start justify-between"
        >
          <div>
            <div className="w-9 h-9 bg-[#101216] rounded-lg flex items-center justify-center text-yellow-400 mb-3">
              <Receipt className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-slate-900 group-hover:text-yellow-600 transition-colors">Invoices & Quotes</h3>
            <p className="text-xs text-slate-500 mt-0.5">Review statements and settled payments</p>
          </div>
        </Link>

        {/* Recent Files Panel */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-slate-900">Latest Assets</h3>
              <span className="text-[11px] text-slate-400">Recent uploads</span>
            </div>
            {isLoading ? (
              <p className="text-xs text-slate-400 py-3">Loading assets...</p>
            ) : data.recentFiles.length === 0 ? (
              <div className="flex items-center gap-2 py-3 text-slate-400 text-xs">
                <Folder className="w-4 h-4" />
                <span>No recent files uploaded.</span>
              </div>
            ) : (
              <div className="space-y-1.5 mt-2">
                {data.recentFiles.slice(0, 2).map((file: any) => (
                  <div key={file.id} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-md border border-slate-100 text-xs text-slate-700">
                    <FileText className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Link to="/projects" className="text-xs font-semibold text-yellow-600 hover:text-yellow-700 mt-2 block">
            View all project assets
          </Link>
        </div>
      </div>

      {/* Active Projects Tracker */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-heading">Active Engagements</h2>
            <p className="text-xs text-slate-500 mt-0.5">Live deliverables in production.</p>
          </div>
          <Link to="/projects" className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            All projects
          </Link>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-slate-400 text-xs py-6 text-center">Loading projects...</p>
          ) : data.activeProjects.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500">
              No active deliverables at this time.
            </div>
          ) : (
            data.activeProjects.map((project: any) => (
              <div key={project.id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900">{project.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-50 text-yellow-800 border border-yellow-200">
                        In Production
                      </span>
                      {project.dueInDays !== null && (
                        <span className="text-xs text-slate-500">
                          Due in {project.dueInDays} days
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 font-heading">{project.progress}% Complete</span>
                  </div>
                </div>
                
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-yellow-400 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
