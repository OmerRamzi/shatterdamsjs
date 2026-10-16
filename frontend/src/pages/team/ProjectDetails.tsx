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
import type { Task, Milestone, TeamMember } from '../../components/admin/project/types';
import { 
  File as FileIcon, 
  Clock, 
  CheckCircle, 
  UploadCloud, 
  Kanban, 
  ListFilter, 
  Layers, 
  Calendar, 
  User as UserIcon, 
  Flame, 
  ArrowLeft 
} from 'lucide-react';

export default function TeamProjectDetailsPage() {
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

  // Task creation/editing modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);
  const [initialTaskStatus, setInitialTaskStatus] = useState<string>('todo');

  // Task inspection modal state (subtasks checklist, comments & timesheets)
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);

  const fetchProjectData = () => {
    setError(null);
    fetch(`/api/portal/team/projects/${projectId}`)
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
        <Link to="/team/projects" className="btn-secondary text-xs inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to My Projects
        </Link>
      </div>
    );
  }

  // Calculate overall task progress
  const completedTasksCount = projectTasks.filter(t => t.status === 'completed').length;
  const progressPercent = projectTasks.length > 0 
    ? Math.round((completedTasksCount / projectTasks.length) * 100) 
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 font-medium">
            <Link to="/team/projects" className="hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> My Projects
            </Link>
            <span>/</span>
            <span className="text-foreground/80">{projectData.client?.companyName || 'Internal Client'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{projectData.title}</h1>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                projectData.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                projectData.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                'bg-slate-500/10 text-slate-400 border border-slate-500/20'
              }`}>
                {projectData.status?.replace('_', ' ')}
              </span>

              {projectData.priority && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase flex items-center gap-1 border ${
                  projectData.priority === 'urgent' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                  projectData.priority === 'high' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                  'bg-secondary text-muted-foreground border-border'
                }`}>
                  <Flame className="w-3 h-3" />
                  {projectData.priority}
                </span>
              )}
            </div>
          </div>

          {projectData.description && (
            <p className="text-sm text-muted-foreground mt-1.5 max-w-3xl leading-relaxed">
              {projectData.description}
            </p>
          )}
        </div>
      </div>

      {/* Progress & Quick Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card border border-border rounded-xl p-4 shadow-2xs">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Overall Delivery</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-foreground">{progressPercent}%</span>
            <span className="text-xs text-muted-foreground">({completedTasksCount}/{projectTasks.length} tasks)</span>
          </div>
          <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-300" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Phases</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-foreground">{projectMilestones.length}</span>
            <span className="text-xs text-muted-foreground">Milestones</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 truncate">
            {projectMilestones.filter(m => m.status === 'completed').length} completed
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Due Date</p>
          <div className="flex items-center gap-1.5 mt-1 text-foreground">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">
              {projectData.deadline ? new Date(projectData.deadline).toLocaleDateString() : 'No deadline set'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Started: {projectData.startDate ? new Date(projectData.startDate).toLocaleDateString() : 'N/A'}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Project Team</p>
          <div className="flex items-center gap-1.5 mt-1 text-foreground">
            <UserIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{teamMembers.length} Members</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 truncate">
            {teamMembers.map(m => m.name).slice(0, 2).join(', ')}{teamMembers.length > 2 ? '...' : ''}
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border gap-2 overflow-x-auto">
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
                              {file.original_filename?.split('.').pop()?.substring(0, 3) || file.originalFilename?.split('.').pop()?.substring(0, 3)}
                            </div>
                            <div>
                              <p className="font-medium text-sm leading-tight mb-1 max-w-[200px] sm:max-w-[320px] truncate">
                                {file.original_filename || file.originalFilename}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{(((file.file_size || file.fileSize) || 0) / 1024 / 1024).toFixed(2)} MB</span>
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
                Project Details
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
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground text-xs">Target Deadline</span>
                  <span className="font-medium text-xs">{projectData.deadline ? new Date(projectData.deadline).toLocaleDateString() : 'Not Set'}</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
              <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-primary" />
                Team Members ({teamMembers.length})
              </h3>
              {teamMembers.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                  No other team members assigned to this project yet.
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
    </div>
  );
}
