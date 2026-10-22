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

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Search and Filters Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center justify-between bg-white p-4 rounded-[26px] border border-slate-200/90 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search task list..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50/80 border border-slate-200/90 rounded-full text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/80">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="completed">Completed</option>
            </select>
          </div>

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

      {/* Task Table */}
      <div className="bg-white border border-slate-200/90 rounded-[26px] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-100 font-heading">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">Status</th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => toggleSort('title')}>
                  <div className="flex items-center gap-1">
                    <span>Task Title & Phase</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 w-28 text-center">Subtasks</th>
                <th className="py-3.5 px-4 w-24 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => toggleSort('priority')}>
                  <div className="flex items-center gap-1">
                    <span>Priority</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 w-36">Assignee</th>
                <th className="py-3.5 px-4 w-24 text-right">Estimate</th>
                <th className="py-3.5 px-4 w-32 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => toggleSort('dueDate')}>
                  <div className="flex items-center gap-1">
                    <span>Due Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 w-16 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {filteredAndSortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
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
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* Status quick toggle */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as any, e as any)}
                          className={`text-[10px] rounded-full px-2.5 py-0.5 font-bold border cursor-pointer focus:outline-hidden font-heading ${
                            task.status === 'completed' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : task.status === 'in_progress'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : task.status === 'review'
                              ? 'bg-yellow-50 text-yellow-900 border-yellow-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">In Review</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>

                      {/* Title & Phase */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors font-heading text-xs">
                          {task.title}
                        </div>
                        {task.milestone && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                            <Layers className="w-3 h-3 text-amber-500" />
                            <span>{task.milestone.title}</span>
                          </div>
                        )}
                      </td>

                      {/* Subtasks */}
                      <td className="py-3.5 px-4 text-center">
                        {subtaskCount > 0 ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-heading ${
                            completedSubtasks === subtaskCount
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            <CheckSquare className="w-3 h-3 text-emerald-500" />
                            {completedSubtasks}/{subtaskCount}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        {getPriorityBadge(task.priority)}
                      </td>

                      {/* Assignee */}
                      <td className="py-3.5 px-4">
                        {task.assignee ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-950 text-[#FACC15] border border-slate-900 flex items-center justify-center text-[9px] font-black shrink-0 font-heading">
                              {task.assignee.profileImage ? (
                                <img src={task.assignee.profileImage} alt={task.assignee.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                task.assignee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <span className="text-xs truncate max-w-[110px] text-slate-700 font-semibold">{task.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unassigned</span>
                        )}
                      </td>

                      {/* Estimate */}
                      <td className="py-3.5 px-4 text-right">
                        {Number(task.estimatedHours) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-semibold">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {Number(task.estimatedHours)}h
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4">
                        {task.dueDate ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-semibold">
                            <Calendar className="w-3 h-3 text-amber-500" />
                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onTaskClick(task)}
                            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
                            title="Edit Task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteTask(task.id, e)}
                            className="p-1.5 hover:bg-rose-50 rounded-full text-slate-400 hover:text-rose-600 transition-colors"
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
