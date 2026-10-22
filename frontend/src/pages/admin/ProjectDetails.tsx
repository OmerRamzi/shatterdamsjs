import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileUpload } from '../../components/ui/FileUpload';
import { FileRowAction } from '../../components/ui/FileRowAction';
import { FileComments } from '../../components/ui/FileComments';
import { ProjectKanban } from '../../components/admin/project/ProjectKanban';
import { ProjectTaskList } from '../../components/admin/project/ProjectTaskList';
import { ProjectMilestones } from '../../components/admin/project/ProjectMilestones';
import { TaskModal } from '../../components/admin/project/TaskModal';
import { TaskDetailModal } from '../../components/admin/project/TaskDetailModal';
import { ProjectAISidepanel } from '../../components/admin/project/ProjectAISidepanel';
import type { Task, Milestone, TeamMember } from '../../components/admin/project/types';
import { 
  File as FileIcon, 
  Clock, 
  CheckCircle, 
  UploadCloud, 
  Kanban, 
  ListFilter, 
  Layers, 
  Plus, 
  Sparkles,
  Calendar,
  User as UserIcon,
  Flame,
  ArrowLeft
} from 'lucide-react';

export default function AdminProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || '');

  const [projectData, setProjectData] = useState<any>(null);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [projectMilestones, setProjectMilestones] = useState<Milestone[]>([]);
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'kanban' | 'list' | 'milestones' | 'files' | 'overview'>('kanban');

  // Task Modal state (for full creation/editing)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);
  const [initialTaskStatus, setInitialTaskStatus] = useState<string>('todo');

  // Task Detail Modal state (for task inspection, subtasks checklist, comments & timesheets)
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);

  // AI Sidepanel state
  const [isAISidepanelOpen, setIsAISidepanelOpen] = useState(false);

  const fetchProjectData = () => {
    setError(null);
    fetch(`/api/projects/${projectId}`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load project (${res.status})`);
        return res.json();
      })
      .then(data => {
        if (!data.project) throw new Error('Project data missing from response');
        setProjectData(data.project);
        setProjectTasks(data.tasks || []);
        setProjectMilestones(data.milestones || []);
        setProjectFiles(data.files || []);
        setTeamMembers(data.teamUsers || []);

        // Keep detail modal updated if a task is currently inspected
        setSelectedTaskForDetail(prev => {
          if (!prev) return null;
          return (data.tasks || []).find((t: Task) => t.id === prev.id) || prev;
        });
      })
      .catch(err => {
        console.error('Error fetching project data:', err);
        setError(err.message || 'Failed to load project');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!isNaN(projectId)) {
      fetchProjectData();
    }
  }, [projectId]);

  const openCreateTask = (status: string = 'todo') => {
    setSelectedTaskForEdit(null);
    setInitialTaskStatus(status);
    setIsTaskModalOpen(true);
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTaskForDetail(task);
    setIsTaskDetailModalOpen(true);
  };

  const handleOpenAIAssistant = () => {
    setIsAISidepanelOpen(true);
  };

  if (isNaN(projectId)) {
    return <div className="p-6 text-destructive">Invalid Project ID</div>;
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[400px]">
        <Clock className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Loading project workspace...</p>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-sm">
          {error || 'Project not found.'}
        </div>
        <Link to="/projects" className="btn-secondary text-xs inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
      </div>
    );
  }

  const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
  const totalTasks = projectTasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-7 w-full max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Header Bento Card */}
      <div className="bg-white rounded-[28px] p-6 sm:p-7 border border-slate-200/90 shadow-2xs bento-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="min-w-0">
            {/* Breadcrumb Eyebrow */}
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-2 font-heading">
              <Link to="/projects" className="hover:text-amber-700 flex items-center gap-1 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Projects</span>
              </Link>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-medium normal-case truncate max-w-[220px]">
                {projectData.client?.companyName || projectData.client?.company_name || 'Client Engagement'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="w-2 h-2 rounded-full bg-[#FACC15] animate-pulse" />
              <span className="text-slate-500">Live Workspace</span>
            </div>

            {/* Title & Badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-heading">
                {projectData.title}
              </h1>
              <span className={`text-[11px] uppercase font-bold px-3 py-1 rounded-full border font-heading inline-flex items-center gap-1.5 ${
                projectData.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : projectData.status === 'active' || projectData.status === 'in_progress'
                  ? 'bg-yellow-50 text-yellow-900 border-yellow-300/80 ring-1 ring-yellow-400/40'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {projectData.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15] animate-pulse" />}
                {projectData.status?.replace('_', ' ')}
              </span>

              {projectData.priority && (
                <span className={`text-[11px] uppercase font-bold px-3 py-1 rounded-full border flex items-center gap-1 font-heading ${
                  projectData.priority === 'urgent'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : projectData.priority === 'high'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  <Flame className="w-3.5 h-3.5 text-amber-500" /> {projectData.priority}
                </span>
              )}
            </div>

            {/* Scope / Description */}
            <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-3xl leading-relaxed font-medium">
              {projectData.description || 'No description provided.'}
            </p>
          </div>

          {/* Quick Header Actions with Shatter Yellow & Dark Luxury */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              id="ai-assistant-toggle-btn"
              onClick={handleOpenAIAssistant}
              className="px-4 py-2.5 rounded-full text-xs font-bold bg-slate-950 hover:bg-slate-800 text-[#FACC15] border border-yellow-400/30 hover:border-yellow-400 shadow-xs hover:shadow-md flex items-center gap-2 transition-all active:scale-95 font-heading"
              title="Launch AI Project Copilot"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FACC15] animate-pulse" />
              <span>AI Copilot</span>
            </button>

            <button
              onClick={() => openCreateTask('todo')}
              className="bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-extrabold text-xs py-2.5 px-5 rounded-full flex items-center gap-2 shadow-xs hover:shadow transition-all active:scale-95 font-heading"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Bottom Bento Metric Strip */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Metric 1: Delivery Progress with Shatter Yellow progress bar */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400 mb-1.5 font-heading">
              <span>Delivery</span>
              <span className="text-slate-900 font-extrabold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-[#FACC15] rounded-full transition-all duration-700" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-1.5 block truncate">
              {totalTasks > 0 ? `${completedTasks} of ${totalTasks} tasks done` : 'No tasks assigned'}
            </span>
          </div>

          {/* Metric 2: Deadline */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
            <span className="text-[10px] font-bold uppercase text-slate-400 font-heading block mb-1">Due Date</span>
            {projectData.deadline ? (
              <>
                <p className="text-xs font-black text-slate-900 font-heading flex items-center gap-1.5 truncate">
                  <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{new Date(projectData.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </p>
                <span className="text-[10px] font-bold text-amber-600 mt-1 block">
                  {(() => {
                    const due = new Date(projectData.deadline);
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    due.setHours(0, 0, 0, 0);
                    const diff = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return diff < 0 ? `${Math.abs(diff)}d overdue` : diff === 0 ? 'Due Today' : `${diff} days remaining`;
                  })()}
                </span>
              </>
            ) : (
              <p className="text-xs font-bold text-slate-400 mt-1">No deadline set</p>
            )}
          </div>

          {/* Metric 3: Team */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
            <span className="text-[10px] font-bold uppercase text-slate-400 font-heading block mb-1">Assigned Team</span>
            <p className="text-xs font-black text-slate-900 font-heading flex items-center gap-1.5 truncate">
              <UserIcon className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
              <span>{teamMembers.length} {teamMembers.length === 1 ? 'Member' : 'Members'}</span>
            </p>
            <span className="text-[10px] font-bold text-slate-500 mt-1 block truncate">
              {teamMembers.length > 0 ? teamMembers.slice(0, 2).map(m => m.name.split(' ')[0]).join(', ') : 'Unassigned'}
            </span>
          </div>

          {/* Metric 4: Scope & Phases */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
            <span className="text-[10px] font-bold uppercase text-slate-400 font-heading block mb-1">Scope & Phases</span>
            <p className="text-xs font-black text-slate-900 font-heading flex items-center gap-1.5 truncate">
              <Layers className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{projectMilestones.length} {projectMilestones.length === 1 ? 'Phase' : 'Phases'}</span>
            </p>
            <span className="text-[10px] font-bold text-emerald-600 mt-1 block truncate">
              {projectData.budget ? `Budget: $${parseFloat(projectData.budget).toLocaleString()}` : `${projectFiles.length} Assets Attached`}
            </span>
          </div>
        </div>
      </div>

      {/* Modern Capsule Segmented Tabs */}
      <div className="flex items-center">
        <div className="bg-slate-100/90 p-1.5 rounded-full inline-flex items-center gap-1.5 border border-slate-200/80 shadow-2xs overflow-x-auto max-w-full">
          <button 
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 font-heading cursor-pointer shrink-0 ${
              activeTab === 'kanban' 
                ? 'bg-slate-950 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Kanban className={`w-3.5 h-3.5 ${activeTab === 'kanban' ? 'text-[#FACC15]' : ''}`} />
            <span>Kanban Board</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              activeTab === 'kanban' ? 'bg-[#FACC15] text-slate-950' : 'bg-slate-200 text-slate-600'
            }`}>
              {projectTasks.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 font-heading cursor-pointer shrink-0 ${
              activeTab === 'list' 
                ? 'bg-slate-950 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ListFilter className={`w-3.5 h-3.5 ${activeTab === 'list' ? 'text-[#FACC15]' : ''}`} />
            <span>Task List</span>
          </button>

          <button 
            onClick={() => setActiveTab('milestones')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 font-heading cursor-pointer shrink-0 ${
              activeTab === 'milestones' 
                ? 'bg-slate-950 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 ${activeTab === 'milestones' ? 'text-[#FACC15]' : ''}`} />
            <span>Phases & Milestones</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              activeTab === 'milestones' ? 'bg-[#FACC15] text-slate-950' : 'bg-slate-200 text-slate-600'
            }`}>
              {projectMilestones.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 font-heading cursor-pointer shrink-0 ${
              activeTab === 'files' 
                ? 'bg-slate-950 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileIcon className={`w-3.5 h-3.5 ${activeTab === 'files' ? 'text-[#FACC15]' : ''}`} />
            <span>Files & Assets</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              activeTab === 'files' ? 'bg-[#FACC15] text-slate-950' : 'bg-slate-200 text-slate-600'
            }`}>
              {projectFiles.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 font-heading cursor-pointer shrink-0 ${
              activeTab === 'overview' 
                ? 'bg-slate-950 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Overview & Scope</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === 'kanban' && (
          <ProjectKanban
            tasks={projectTasks}
            milestones={projectMilestones}
            teamMembers={teamMembers}
            onTasksUpdate={fetchProjectData}
            onTaskClick={openTaskDetail}
            onAddTask={openCreateTask}
          />
        )}

        {activeTab === 'list' && (
          <ProjectTaskList
            tasks={projectTasks}
            milestones={projectMilestones}
            teamMembers={teamMembers}
            onTasksUpdate={fetchProjectData}
            onTaskClick={openTaskDetail}
            onAddTask={openCreateTask}
          />
        )}

        {activeTab === 'milestones' && (
          <ProjectMilestones
            projectId={projectId}
            milestones={projectMilestones}
            tasks={projectTasks}
            onMilestonesUpdate={fetchProjectData}
            onOpenAIAssistant={handleOpenAIAssistant}
            onTaskClick={openTaskDetail}
          />
        )}

        {activeTab === 'files' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    <FileIcon className="w-4 h-4 text-primary" />
                    Project Deliverables & Documents
                  </h3>
                </div>
                
                <div className="divide-y divide-border">
                  {projectFiles.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <UploadCloud className="w-10 h-10 mx-auto opacity-20 mb-3" />
                      <p className="text-sm">No files uploaded yet.</p>
                    </div>
                  ) : (
                    projectFiles.map((file) => (
                      <div key={file.id} className="p-4 hover:bg-secondary/10 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                              {file.original_filename?.split('.').pop()?.substring(0, 3)}
                            </div>
                            <div>
                              <p className="font-medium text-sm leading-tight mb-1 max-w-[200px] sm:max-w-[320px] truncate">
                                {file.original_filename}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{((file.file_size || 0) / 1024 / 1024).toFixed(2)} MB</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  {file.status === 'approved' ? (
                                    <span className="text-emerald-500 flex items-center gap-1 font-medium"><CheckCircle className="w-3 h-3" /> Approved</span>
                                  ) : file.status === 'client_review' ? (
                                    <span className="text-amber-500 flex items-center gap-1 font-medium"><Clock className="w-3 h-3" /> Client Review</span>
                                  ) : (
                                    <span className="text-blue-500 flex items-center gap-1 font-medium"><Clock className="w-3 h-3" /> Internal Review</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <FileRowAction 
                            fileId={file.id} 
                            currentStatus={file.status} 
                            onStatusUpdate={fetchProjectData}
                            onDeleteSuccess={fetchProjectData}
                          />
                        </div>
                        
                        <FileComments fileId={file.id} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <FileUpload projectId={projectId} onUploadSuccess={fetchProjectData} />
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
              <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Project Metadata & Scope
              </h3>
              <div className="space-y-3.5 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground text-xs">Status</span>
                  <span className="capitalize font-medium text-xs">{projectData.status?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground text-xs">Priority</span>
                  <span className="capitalize font-medium text-xs">{projectData.priority}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground text-xs">Start Date</span>
                  <span className="font-medium text-xs">{projectData.startDate ? new Date(projectData.startDate).toLocaleDateString() : 'Immediate'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground text-xs">Target Deadline</span>
                  <span className="font-medium text-xs">{projectData.deadline ? new Date(projectData.deadline).toLocaleDateString() : 'Not Set'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground text-xs">Contract Budget</span>
                  <span className="font-semibold text-emerald-500 text-xs">${projectData.budget || '0.00'}</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
              <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-primary" />
                Assigned Team Members ({teamMembers.length})
              </h3>
              {teamMembers.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                  No team members assigned to this project yet.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {teamMembers.map(member => (
                    <div key={member.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {member.profileImage ? (
                            <img src={member.profileImage} alt={member.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-xs text-foreground leading-tight">{member.name}</p>
                          <p className="text-[11px] text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task Creation & Editing Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSaved={fetchProjectData}
        task={selectedTaskForEdit}
        projectId={projectId}
        initialStatus={initialTaskStatus}
        milestones={projectMilestones}
        teamMembers={teamMembers}
      />

      {/* Task Inspection & Detail Modal (Subtasks, Comments & Timesheets) */}
      <TaskDetailModal
        isOpen={isTaskDetailModalOpen}
        onClose={() => {
          setIsTaskDetailModalOpen(false);
          setSelectedTaskForDetail(null);
        }}
        task={selectedTaskForDetail}
        milestones={projectMilestones}
        teamMembers={teamMembers}
        onTaskUpdated={fetchProjectData}
        onTaskDeleted={() => {
          setIsTaskDetailModalOpen(false);
          setSelectedTaskForDetail(null);
          fetchProjectData();
        }}
      />

      {/* AI Conversational Sidepanel & Breakdown Copilot */}
      <ProjectAISidepanel
        isOpen={isAISidepanelOpen}
        onClose={() => setIsAISidepanelOpen(false)}
        projectId={projectId}
        projectTitle={projectData.title}
        onBreakdownApplied={fetchProjectData}
      />
    </div>
  );
}
