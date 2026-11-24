import { useState, useEffect } from 'react';
import { FolderGit2, ArrowRight, Clock, CheckSquare } from "lucide-react";
import { Link } from "react-router-dom";

export default function TeamDashboardPage() {
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/team/projects')
      .then(res => res.json())
      .then(data => setProjectsData(Array.isArray(data) ? data : []))
      .catch(() => setProjectsData([]))
      .finally(() => setIsLoading(false));
  }, []);

  const activeProjects = projectsData.filter(p => p.project?.status !== 'completed');

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
