import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileUpload } from '../../components/ui/FileUpload';
import { FileRowAction } from '../../components/ui/FileRowAction';
import { FileComments } from '../../components/ui/FileComments';
import { ProjectKanban } from '../../components/admin/project/ProjectKanban';
import { ProjectTaskList } from '../../components/admin/project/ProjectTaskList';
import { ProjectMilestones } from '../../components/admin/project/ProjectMilestones';
import { TaskModal } from '../../components/admin/project/TaskModal';
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
  DollarSign,
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

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);
  const [initialTaskStatus, setInitialTaskStatus] = useState<string>('todo');

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

  const openEditTask = (task: Task) => {
    setSelectedTaskForEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleOpenAIAssistant = () => {
    // Phase 4 will mount the full interactive dockable AI sidepanel here!
    // Alert user that sidepanel will launch in Phase 4
    const btn = document.getElementById('ai-assistant-toggle-btn');
    if (btn) btn.click();
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
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 font-medium">
              <Link to="/projects" className="hover:text-foreground transition-colors flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Projects
              </Link>
              <span>/</span>
              <span>{projectData.client?.companyName || projectData.client?.company_name || 'Client'}</span>
            </div>

            {/* Title & Badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {projectData.title}
              </h1>
              <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                projectData.status === 'completed'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : projectData.status === 'active' || projectData.status === 'in_progress'
                  ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                  : 'bg-secondary text-muted-foreground border-border'
              }`}>
                {projectData.status?.replace('_', ' ')}
              </span>

              {projectData.priority && (
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  projectData.priority === 'urgent'
                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                    : projectData.priority === 'high'
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    : 'bg-secondary text-muted-foreground border-border'
                }`}>
                  <Flame className="w-3 h-3" /> {projectData.priority}
                </span>
              )}
            </div>

            {/* Scope / Description */}
            <p className="text-muted-foreground text-xs sm:text-sm mt-1 max-w-3xl line-clamp-2">
              {projectData.description || 'No description provided.'}
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              id="ai-assistant-toggle-btn"
              onClick={handleOpenAIAssistant}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Assistant</span>
            </button>

            <button
              onClick={() => openCreateTask('todo')}
              className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Mini progress tracker */}
        <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6 text-muted-foreground">
            {projectData.deadline && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Due: {new Date(projectData.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </span>
            )}
            {projectData.budget && (
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                <span>Budget: ${projectData.budget}</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-blue-500" />
              <span>{teamMembers.length} Team Members</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-muted-foreground font-medium">Delivery:</span>
            <div className="w-28 bg-secondary h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-bold text-foreground">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto pb-px">
        <button 
          onClick={() => setActiveTab('kanban')}
          className={`pb-3 px-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'kanban' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Kanban className="w-4 h-4" />
          <span>Kanban Board</span>
          <span className="bg-secondary text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium">
            {projectTasks.length}
          </span>
        </button>

        <button 
          onClick={() => setActiveTab('list')}
          className={`pb-3 px-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'list' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Task List</span>
        </button>

        <button 
          onClick={() => setActiveTab('milestones')}
          className={`pb-3 px-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'milestones' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Phases & Milestones</span>
          <span className="bg-secondary text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium">
            {projectMilestones.length}
          </span>
        </button>

        <button 
          onClick={() => setActiveTab('files')}
          className={`pb-3 px-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'files' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileIcon className="w-4 h-4" />
          <span>Files & Assets</span>
          <span className="bg-secondary text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium">
            {projectFiles.length}
          </span>
        </button>

        <button 
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'overview' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Overview & Scope</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === 'kanban' && (
          <ProjectKanban
            tasks={projectTasks}
            milestones={projectMilestones}
            teamMembers={teamMembers}
            onTasksUpdate={fetchProjectData}
            onTaskClick={openEditTask}
            onAddTask={openCreateTask}
          />
        )}

        {activeTab === 'list' && (
          <ProjectTaskList
            tasks={projectTasks}
            milestones={projectMilestones}
            teamMembers={teamMembers}
            onTasksUpdate={fetchProjectData}
            onTaskClick={openEditTask}
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
            onTaskClick={openEditTask}
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
    </div>
  );
}
