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
  Trash2,
  Edit2,
  Flame,
  ArrowUpDown
} from 'lucide-react';
import type { Task, Milestone, TeamMember } from './types';

interface ProjectTaskListProps {
  tasks: Task[];
  milestones: Milestone[];
  teamMembers: TeamMember[];
  onTasksUpdate: () => void;
  onTaskClick: (task: Task) => void;
  onAddTask: (status?: string) => void;
}

export function ProjectTaskList({
  tasks,
  milestones,
  teamMembers,
  onTasksUpdate,
  onTaskClick,
  onAddTask
}: ProjectTaskListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMilestone, setSelectedMilestone] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate' | 'priority' | 'title'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedTasks = useMemo(() => {
    const filtered = tasks.filter(task => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }
      if (selectedStatus !== 'all' && task.status !== selectedStatus) return false;
      if (selectedMilestone !== 'all') {
        if (selectedMilestone === 'none') {
          if (task.milestoneId) return false;
        } else if (task.milestoneId !== parseInt(selectedMilestone)) {
          return false;
        }
      }
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;
      if (selectedAssignee !== 'all') {
        if (selectedAssignee === 'unassigned') {
          if (task.assignedTo) return false;
        } else if (task.assignedTo !== parseInt(selectedAssignee)) {
          return false;
        }
      }
      return true;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortBy === 'priority') {
        const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
        comparison = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      } else {
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [tasks, searchQuery, selectedStatus, selectedMilestone, selectedPriority, selectedAssignee, sortBy, sortOrder]);

  const handleStatusChange = async (taskId: number, newStatus: Task['status'], e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      onTasksUpdate();
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  const handleDeleteTask = async (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
      onTasksUpdate();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
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

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search task list..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-lg border border-border/50">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent border-none text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="completed">Completed</option>
            </select>
          </div>

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

      {/* Task Table */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/40 text-muted-foreground text-xs uppercase font-semibold border-b border-border">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Status</th>
                <th className="py-3 px-4 cursor-pointer hover:text-foreground" onClick={() => toggleSort('title')}>
                  <div className="flex items-center gap-1">
                    <span>Task Title & Phase</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 w-28 text-center">Subtasks</th>
                <th className="py-3 px-4 w-24 cursor-pointer hover:text-foreground" onClick={() => toggleSort('priority')}>
                  <div className="flex items-center gap-1">
                    <span>Priority</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 w-36">Assignee</th>
                <th className="py-3 px-4 w-24 text-right">Estimate</th>
                <th className="py-3 px-4 w-32 cursor-pointer hover:text-foreground" onClick={() => toggleSort('dueDate')}>
                  <div className="flex items-center gap-1">
                    <span>Due Date</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 w-16 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAndSortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                    No tasks found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredAndSortedTasks.map(task => {
                  const subtasksArr = Array.isArray(task.subtasks) ? task.subtasks : [];
                  const subtaskCount = subtasksArr.length;
                  const completedSubtasks = subtasksArr.filter((st: any) => st.completed).length;

                  return (
                    <tr
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="hover:bg-secondary/20 transition-colors cursor-pointer group"
                    >
                      {/* Status quick toggle */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as any, e as any)}
                          className={`text-xs rounded-full px-2 py-0.5 font-medium border cursor-pointer focus:outline-hidden ${
                            task.status === 'completed' 
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : task.status === 'in_progress'
                              ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                              : task.status === 'review'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-secondary text-muted-foreground border-border'
                          }`}
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">In Review</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>

                      {/* Title & Phase */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {task.title}
                        </div>
                        {task.milestone && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                            <Layers className="w-3 h-3 text-muted-foreground/70" />
                            <span>{task.milestone.title}</span>
                          </div>
                        )}
                      </td>

                      {/* Subtasks */}
                      <td className="py-3 px-4 text-center">
                        {subtaskCount > 0 ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                            completedSubtasks === subtaskCount
                              ? 'bg-emerald-500/10 text-emerald-600 font-semibold'
                              : 'bg-secondary text-muted-foreground'
                          }`}>
                            <CheckSquare className="w-3 h-3" />
                            {completedSubtasks}/{subtaskCount}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4">
                        {getPriorityBadge(task.priority)}
                      </td>

                      {/* Assignee */}
                      <td className="py-3 px-4">
                        {task.assignee ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                              {task.assignee.profileImage ? (
                                <img src={task.assignee.profileImage} alt={task.assignee.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                task.assignee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <span className="text-xs truncate max-w-[100px] text-foreground">{task.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs italic">Unassigned</span>
                        )}
                      </td>

                      {/* Estimate */}
                      <td className="py-3 px-4 text-right">
                        {Number(task.estimatedHours) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {Number(task.estimatedHours)}h
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-4">
                        {task.dueDate ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onTaskClick(task)}
                            className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit Task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteTask(task.id, e)}
                            className="p-1 hover:bg-rose-500/10 rounded text-muted-foreground hover:text-rose-500 transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
