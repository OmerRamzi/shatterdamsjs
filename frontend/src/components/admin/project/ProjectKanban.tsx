import { useState, useMemo } from 'react';
import { 
  Plus, 
  Clock, 
  CheckSquare, 
  Search,
  Filter,
  Layers,
  Calendar,
  User as UserIcon,
  Flame
} from 'lucide-react';
import type { Task, Milestone, TeamMember } from './types';

interface ProjectKanbanProps {
  tasks: Task[];
  milestones: Milestone[];
  teamMembers: TeamMember[];
  onTasksUpdate: () => void;
  onTaskClick: (task: Task) => void;
  onAddTask: (status?: string) => void;
}

const COLUMNS: Array<{ id: Task['status']; title: string; color: string; dotColor: string }> = [
  { id: 'todo', title: 'To Do', color: 'border-slate-500/20 bg-slate-500/5', dotColor: 'bg-slate-400' },
  { id: 'in_progress', title: 'In Progress', color: 'border-blue-500/20 bg-blue-500/5', dotColor: 'bg-blue-500' },
  { id: 'review', title: 'In Review', color: 'border-amber-500/20 bg-amber-500/5', dotColor: 'bg-amber-500' },
  { id: 'completed', title: 'Completed', color: 'border-emerald-500/20 bg-emerald-500/5', dotColor: 'bg-emerald-500' },
];

export function ProjectKanban({
  tasks,
  milestones,
  teamMembers,
  onTasksUpdate,
  onTaskClick,
  onAddTask
}: ProjectKanbanProps) {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMilestone, setSelectedMilestone] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Keep localTasks in sync when parent tasks change
  useMemo(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return localTasks.filter(task => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }
      if (selectedMilestone !== 'all') {
        if (selectedMilestone === 'none') {
          if (task.milestoneId) return false;
        } else if (task.milestoneId !== parseInt(selectedMilestone)) {
          return false;
        }
      }
      if (selectedAssignee !== 'all') {
        if (selectedAssignee === 'unassigned') {
          if (task.assignedTo) return false;
        } else if (task.assignedTo !== parseInt(selectedAssignee)) {
          return false;
        }
      }
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
        return false;
      }
      return true;
    });
  }, [localTasks, searchQuery, selectedMilestone, selectedAssignee, selectedPriority]);

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('text/plain', taskId.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskIdStr = e.dataTransfer.getData('text/plain');
    const taskId = parseInt(taskIdStr);
    setDraggedTaskId(null);

    if (isNaN(taskId)) return;

    const targetTask = localTasks.find(t => t.id === taskId);
    if (!targetTask || targetTask.status === newStatus) return;

    // Optimistic update
    const prevTasks = [...localTasks];
    const updated = localTasks.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    );
    setLocalTasks(updated);

    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        throw new Error('Failed to update task status');
      }
      onTasksUpdate();
    } catch (err) {
      console.error('Drag and drop error:', err);
      // Revert optimistic update
      setLocalTasks(prevTasks);
    }
  };

  const getPriorityBadge = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"><Flame className="w-3 h-3" /> Urgent</span>;
      case 'high':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">High</span>;
      case 'medium':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">Medium</span>;
      case 'low':
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-secondary text-muted-foreground border border-border">Low</span>;
    }
  };

  const formatDueDate = (dueDateStr: string | null, status: Task['status']) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = due < today && status !== 'completed';
    const isToday = due.toDateString() === today.toDateString() && status !== 'completed';

    return (
      <span className={`inline-flex items-center gap-1 text-[11px] ${
        isOverdue ? 'text-rose-500 font-semibold' : isToday ? 'text-amber-500 font-semibold' : 'text-muted-foreground'
      }`}>
        <Calendar className="w-3 h-3" />
        {due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Milestone Filter */}
          <div className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-lg border border-border/50">
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={selectedMilestone}
              onChange={(e) => setSelectedMilestone(e.target.value)}
              className="bg-transparent border-none text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Phases</option>
              <option value="none">Unassigned</option>
              {milestones.map(m => (
                <option key={m.id} value={m.id.toString()}>{m.title}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-lg border border-border/50">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-transparent border-none text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-lg border border-border/50">
            <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="bg-transparent border-none text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {teamMembers.map(tm => (
                <option key={tm.id} value={tm.id.toString()}>{tm.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onAddTask()}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 ml-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Kanban 4-Column Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col rounded-xl border transition-all min-h-[500px] ${col.color} ${
                isOver ? 'ring-2 ring-primary ring-offset-2 bg-primary/5 border-primary/40' : ''
              }`}
            >
              {/* Column Header */}
              <div className="p-3.5 flex items-center justify-between border-b border-border/50 bg-card/60 rounded-t-xl backdrop-blur-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                  <h4 className="font-semibold text-sm tracking-tight">{col.title}</h4>
                  <span className="bg-secondary text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => onAddTask(col.id)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title={`Add task to ${col.title}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Tasks Column Body */}
              <div className="p-3 space-y-2.5 flex-1 overflow-y-auto max-h-[75vh]">
                {colTasks.length === 0 ? (
                  <div className="h-32 border-2 border-dashed border-border/60 rounded-xl flex items-center justify-center text-xs text-muted-foreground/60 select-none">
                    Drop tasks here
                  </div>
                ) : (
                  colTasks.map(task => {
                    const isBeingDragged = draggedTaskId === task.id;
                    const subtasksArr = Array.isArray(task.subtasks) ? task.subtasks : [];
                    const subtaskCount = subtasksArr.length;
                    const completedSubtasks = subtasksArr.filter((st: any) => st.completed).length;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => onTaskClick(task)}
                        className={`group bg-card hover:bg-card/90 border border-border/70 hover:border-primary/50 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none ${
                          isBeingDragged ? 'opacity-40 scale-95' : 'opacity-100'
                        }`}
                      >
                        {/* Top row: Priority & Milestone */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {getPriorityBadge(task.priority)}
                            {task.milestone && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary/80 px-1.5 py-0.5 rounded border border-border/50 truncate max-w-[130px]">
                                <Layers className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{task.milestone.title}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Task Title */}
                        <h5 className="font-medium text-sm text-foreground leading-snug group-hover:text-primary transition-colors mb-1.5">
                          {task.title}
                        </h5>

                        {/* Description Preview (if present) */}
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                            {task.description}
                          </p>
                        )}

                        {/* Bottom Metadata: Subtasks, Estimate, Due Date & Assignee */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2.5">
                            {/* Checklist Subtasks */}
                            {subtaskCount > 0 && (
                              <span className={`inline-flex items-center gap-1 text-[11px] ${
                                completedSubtasks === subtaskCount ? 'text-emerald-500 font-semibold' : 'text-muted-foreground'
                              }`}>
                                <CheckSquare className="w-3 h-3" />
                                {completedSubtasks}/{subtaskCount}
                              </span>
                            )}

                            {/* Estimated Hours */}
                            {Number(task.estimatedHours) > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {Number(task.estimatedHours)}h
                              </span>
                            )}

                            {/* Due Date */}
                            {task.dueDate && formatDueDate(task.dueDate, task.status)}
                          </div>

                          {/* Assignee Avatar */}
                          {task.assignee ? (
                            <div 
                              className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0"
                              title={`Assigned to: ${task.assignee.name}`}
                            >
                              {task.assignee.profileImage ? (
                                <img 
                                  src={task.assignee.profileImage} 
                                  alt={task.assignee.name} 
                                  className="w-full h-full rounded-full object-cover" 
                                />
                              ) : (
                                task.assignee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                              )}
                            </div>
                          ) : (
                            <div 
                              className="w-6 h-6 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground/40 shrink-0"
                              title="Unassigned"
                            >
                              <UserIcon className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
