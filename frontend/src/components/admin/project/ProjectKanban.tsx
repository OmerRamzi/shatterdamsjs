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

const COLUMNS: Array<{ id: Task['status']; title: string; color: string; dotColor: string; bgBadge: string }> = [
  { id: 'todo', title: 'To Do', color: 'border-slate-200/80 bg-slate-50/70', dotColor: 'bg-slate-400', bgBadge: 'bg-white text-slate-700 border-slate-200/80' },
  { id: 'in_progress', title: 'In Progress', color: 'border-amber-200/70 bg-amber-50/30', dotColor: 'bg-amber-500', bgBadge: 'bg-amber-50 text-amber-900 border-amber-200' },
  { id: 'review', title: 'In Review', color: 'border-yellow-300/80 bg-yellow-50/40', dotColor: 'bg-[#FACC15]', bgBadge: 'bg-yellow-100 text-yellow-900 border-yellow-200' },
  { id: 'completed', title: 'Completed', color: 'border-emerald-200/70 bg-emerald-50/30', dotColor: 'bg-emerald-500', bgBadge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
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
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 font-heading"><Flame className="w-3 h-3 text-rose-500" /> Urgent</span>;
      case 'high':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 font-heading">High</span>;
      case 'medium':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 font-heading">Medium</span>;
      case 'low':
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 font-heading">Low</span>;
    }
  };

  const formatDueDate = (dueDateStr: string | null, status: Task['status']) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = diffDays < 0 && status !== 'completed';
    const isToday = diffDays === 0 && status !== 'completed';

    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
        isOverdue 
          ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 font-heading' 
          : isToday 
            ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 font-heading' 
            : 'text-slate-500 bg-slate-100 font-heading'
      }`}>
        <Calendar className="w-3 h-3 text-amber-500" />
        {isOverdue ? `${Math.abs(diffDays)}d overdue` : isToday ? 'Due Today' : due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Filter and Search Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center justify-between bg-white p-4 rounded-[26px] border border-slate-200/90 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks by title or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50/80 border border-slate-200/90 rounded-full text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Milestone Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/80">
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <select
              value={selectedMilestone}
              onChange={(e) => setSelectedMilestone(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Phases</option>
              <option value="none">Unassigned</option>
              {milestones.map(m => (
                <option key={m.id} value={m.id.toString()}>{m.title}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/80">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/80">
            <UserIcon className="w-3.5 h-3.5 text-amber-600" />
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
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
            className="bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-extrabold text-xs py-2 px-4 rounded-full flex items-center gap-1.5 ml-auto shadow-xs hover:shadow transition-all active:scale-95 font-heading"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Kanban 4-Column Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4.5 items-start">
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col rounded-[26px] border transition-all min-h-[520px] ${col.color} shadow-2xs ${
                isOver ? 'ring-2 ring-amber-400 ring-offset-2 bg-yellow-50/60 border-amber-400' : ''
              }`}
            >
              {/* Column Header */}
              <div className="p-4 flex items-center justify-between border-b border-slate-200/70 bg-white/70 rounded-t-[26px] backdrop-blur-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor} shadow-2xs`} />
                  <h4 className="font-extrabold text-sm tracking-tight text-slate-900 font-heading">{col.title}</h4>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black border shadow-2xs font-heading ${col.bgBadge}`}>
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => onAddTask(col.id)}
                  className="w-7 h-7 rounded-full bg-white border border-slate-200/90 text-slate-600 hover:text-slate-950 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs active:scale-90"
                  title={`Add task to ${col.title}`}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              {/* Tasks Column Body */}
              <div className="p-3.5 space-y-3 flex-1 overflow-y-auto max-h-[75vh]">
                {colTasks.length === 0 ? (
                  <div className="h-36 border-2 border-dashed border-slate-200/90 rounded-[20px] flex flex-col items-center justify-center text-xs font-semibold text-slate-400 gap-1.5 bg-white/40 select-none font-heading">
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    <span>Drop tasks here</span>
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
                        className={`group bg-white hover:bg-white border border-slate-200/90 hover:border-amber-300/80 rounded-[20px] p-4 shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none relative overflow-hidden ${
                          isBeingDragged ? 'opacity-40 scale-95' : 'opacity-100'
                        }`}
                      >
                        {/* Top row: Priority & Milestone */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {getPriorityBadge(task.priority)}
                            {task.milestone && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60 truncate max-w-[130px] font-heading">
                                <Layers className="w-2.5 h-2.5 shrink-0 text-amber-500" />
                                <span className="truncate">{task.milestone.title}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Task Title */}
                        <h5 className="font-extrabold text-sm text-slate-900 leading-snug group-hover:text-amber-600 transition-colors mb-1.5 font-heading">
                          {task.title}
                        </h5>

                        {/* Description Preview (if present) */}
                        {task.description && (
                          <p className="text-xs text-slate-400 line-clamp-2 mb-3 font-medium">
                            {task.description}
                          </p>
                        )}

                        {/* Bottom Metadata: Subtasks, Estimate, Due Date & Assignee */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Checklist Subtasks */}
                            {subtaskCount > 0 && (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full font-heading ${
                                completedSubtasks === subtaskCount 
                                  ? 'bg-emerald-50 text-emerald-700' 
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                <CheckSquare className="w-3 h-3 text-emerald-500" />
                                {completedSubtasks}/{subtaskCount}
                              </span>
                            )}

                            {/* Estimated Hours */}
                            {Number(task.estimatedHours) > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full font-heading">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {Number(task.estimatedHours)}h
                              </span>
                            )}

                            {/* Due Date */}
                            {task.dueDate && formatDueDate(task.dueDate, task.status)}
                          </div>

                          {/* Assignee Avatar with Luxury Dark Slate & Initials */}
                          {task.assignee ? (
                            <div 
                              className="w-6 h-6 rounded-full bg-slate-950 text-[#FACC15] border border-slate-900 flex items-center justify-center text-[10px] font-black shrink-0 font-heading shadow-2xs"
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
                              className="w-6 h-6 rounded-full border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"
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
