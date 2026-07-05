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
    <div className="min-h-full p-10 bg-slate-50/50">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header & Search */}
        <div className="text-center space-y-8 mt-4">
          <h1 className="text-[40px] font-black text-slate-900 tracking-tight">Welcome Back, {user?.name || 'Client'}!</h1>
          
          <div className="max-w-[600px] mx-auto relative">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search docs, files, invoices..." 
              className="w-full pl-14 pr-6 py-4 rounded-full border border-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-slate-700 bg-white text-base placeholder:text-slate-400 font-medium transition-shadow"
            />
          </div>
        </div>

        {/* Quick Links & Latest Docs */}
        <div className="grid md:grid-cols-3 gap-6 pt-4">
          {/* Files & Proofs */}
          <Link to="/projects" className="bg-white rounded-[32px] p-8 flex flex-col items-center justify-center gap-6 shadow-sm hover:shadow-md transition-shadow group h-[260px]">
            <div className="w-16 h-16 bg-[#18181b] rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <FileText className="w-7 h-7 text-yellow-400" />
            </div>
            <span className="font-bold text-[17px] text-slate-900">Files & Proofs</span>
          </Link>

          {/* Invoices & Quotes */}
          <Link to="/invoices" className="bg-white rounded-[32px] p-8 flex flex-col items-center justify-center gap-6 shadow-sm hover:shadow-md transition-shadow group h-[260px]">
            <div className="w-16 h-16 bg-[#18181b] rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Receipt className="w-7 h-7 text-yellow-400" />
            </div>
            <span className="font-bold text-[17px] text-slate-900">Invoices & Quotes</span>
          </Link>

          {/* Latest Docs Panel */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm flex flex-col h-[260px]">
            <h3 className="font-bold text-[19px] text-slate-900 mb-4">Latest Docs</h3>
            <div className="flex-1 bg-slate-50/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3">
              {isLoading ? (
                <p className="text-sm text-slate-500 font-medium">Loading...</p>
              ) : data.recentFiles.length === 0 ? (
                <>
                  <Folder className="w-7 h-7 text-slate-400" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-slate-500">No recent documents uploaded.</p>
                </>
              ) : (
                <div className="w-full space-y-3">
                  {data.recentFiles.slice(0, 3).map((file: any) => (
                    <div key={file.id} className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100">
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Projects Tracker */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-[22px] font-black text-slate-900">Active Projects Tracker</h2>
              <p className="text-slate-500 font-medium mt-1">Monitor the progress of your ongoing engagements.</p>
            </div>
            <Link to="/projects" className="px-6 py-2 rounded-full border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors text-sm">
              View All
            </Link>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <p className="text-slate-500 font-medium text-center py-8">Loading projects...</p>
            ) : data.activeProjects.length === 0 ? (
              <p className="text-slate-500 font-medium text-center py-8 bg-slate-50/80 rounded-2xl">You have no active projects.</p>
            ) : (
              data.activeProjects.map((project: any) => (
                <div key={project.id} className="border border-slate-100 rounded-3xl p-6 hover:border-slate-200 transition-colors bg-white">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 mb-2">{project.title}</h3>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        Active
                      </span>
                    </div>
                    {project.dueInDays !== null && (
                      <div className="flex items-center gap-1.5 text-slate-500 font-medium text-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Due in {project.dueInDays} days
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-end">
                      <span className="text-sm font-bold text-slate-900">{project.progress}% Complete</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-yellow-400 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
