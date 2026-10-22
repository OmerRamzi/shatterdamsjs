import { useState, useEffect } from 'react';
import { Plus, Search, FolderGit2, Pencil, Trash2, Calendar, Flame, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import { ProjectModal } from "../../components/admin/ProjectModal";

export default function AdminProjectsPage() {
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
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-300">
      {/* Top Header Banner with Space Grotesk */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1 font-heading">
            <span className="w-2 h-2 rounded-full bg-[#FACC15] animate-pulse" />
            <span>Client Engagements</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 normal-case font-medium">{projects.length} Total</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-heading">Projects</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
            Monitor client deliverables, scope timelines, and live progress.
          </p>
        </div>
        <button 
          onClick={handleAdd} 
          className="bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-extrabold text-xs sm:text-sm py-2.5 px-5 rounded-full flex items-center gap-2 shadow-xs hover:shadow transition-all active:scale-95 font-heading"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Table Bento Card */}
      <div className="bg-white border border-slate-200/90 rounded-[28px] shadow-2xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects by title, client, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50/80 border border-slate-200/90 rounded-full text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
          <span className="text-xs text-slate-400 font-semibold self-center font-heading">
            Showing {filteredProjects.length} of {projects.length}
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-100 font-heading">
              <tr>
                <th className="px-6 py-3.5">Title & Client</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Priority</th>
                <th className="px-6 py-3.5">Progress</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs">
                    Loading projects...
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <FolderGit2 className="w-8 h-8 opacity-40 text-slate-400" />
                      <p className="font-semibold text-slate-600 font-heading">No active projects found</p>
                      <p className="text-[11px] text-slate-400">Create a new engagement to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-yellow-50 border border-yellow-200/80 flex items-center justify-center text-yellow-800 shrink-0 shadow-2xs">
                          <Briefcase className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <Link to={`/projects/${project.id}`} className="font-extrabold text-slate-900 hover:text-amber-600 transition-colors font-heading text-sm truncate block">
                            {project.title}
                          </Link>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-1.5 truncate">
                            <Calendar className="w-3 h-3 text-amber-500" />
                            <span>Deadline: {project.deadline ? new Date(project.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Not set"}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border font-heading inline-flex items-center gap-1 ${
                        project.status === 'active' 
                          ? 'bg-yellow-50 text-yellow-900 border-yellow-300'
                          : project.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {project.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15] animate-pulse" />}
                        {project.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border font-heading inline-flex items-center gap-1 ${
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
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-amber-400 via-yellow-400 to-[#FACC15] h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-800 font-heading">{project.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(project)}
                          className="text-slate-400 hover:text-slate-900 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                          title="Edit Project"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(project.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-full hover:bg-rose-50 transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
