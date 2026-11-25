import { useState, useEffect } from 'react';
import { Plus, Search, FolderGit2, Pencil, Trash2, Calendar, Flame, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import { ProjectModal } from "../../components/admin/ProjectModal";
import { useAuth } from "../../context/AuthContext";

export default function AdminProjectsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('projects', 'manage');
  const canDelete = hasPermission('projects', 'full');
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const fetchProjects = () => {
    setIsLoading(true);
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleAdd = () => {
    setSelectedProject(null);
    setIsModalOpen(true);
  };

  const handleEdit = (project: any) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProjects();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete project');
      }
    } catch (error) {
      alert('Error deleting project');
    }
  };

  const filteredProjects = projects.filter(p => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (p.title && p.title.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query)) ||
      (p.client?.companyName && p.client.companyName.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-1">
            Studio Deliverables — {projects.length} engagements
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 font-heading">
            Projects
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track client scopes, production milestones, and deliverables.
          </p>
        </div>
        {canManage && (
          <button 
            onClick={handleAdd} 
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs sm:text-sm py-2 px-4 rounded-lg flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New project</span>
          </button>
        )}
      </div>

      {/* Projects Table Card */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, client, or scope..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium self-center">
            Showing {filteredProjects.length} of {projects.length} projects
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/75 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Project & Client</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Progress</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400 text-xs">
                    Loading projects...
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FolderGit2 className="w-7 h-7 opacity-40 text-slate-400" />
                      <p className="font-semibold text-slate-700">No active projects found</p>
                      <p className="text-[11px] text-slate-400">Create a new engagement to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-700 shrink-0">
                          <Briefcase className="w-4 h-4 text-yellow-600" />
                        </div>
                        <div className="min-w-0">
                          <Link to={`/projects/${project.id}`} className="font-semibold text-slate-900 hover:text-yellow-600 transition-colors text-xs sm:text-sm truncate block">
                            {project.title}
                          </Link>
                          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Due {project.deadline ? new Date(project.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Not set"}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize border ${
                        project.status === 'active' 
                          ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                          : project.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {project.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize border inline-flex items-center gap-1 ${
                        project.priority === 'urgent'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : project.priority === 'high'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {project.priority === 'urgent' && <Flame className="w-3 h-3 text-rose-500" />}
                        {project.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-yellow-400 h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{project.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canManage && (
                          <button 
                            onClick={() => handleEdit(project)}
                            className="text-slate-400 hover:text-slate-900 p-1 rounded-md hover:bg-slate-100 transition-colors"
                            title="Edit project"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            onClick={() => handleDelete(project.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                            title="Delete project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProjectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchProjects}
        project={selectedProject}
      />
    </div>
  );
}
