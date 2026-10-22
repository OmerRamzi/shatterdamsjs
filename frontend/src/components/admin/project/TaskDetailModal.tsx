import { useState, useEffect } from 'react';
import { 
  X, 
  CheckSquare, 
  Clock, 
  Layers, 
  Calendar, 
  User as UserIcon, 
  Trash2, 
  Plus, 
  Send, 
  MessageSquare, 
  Timer
} from 'lucide-react';
import type { Task, Milestone, TeamMember, Subtask } from './types';

interface TaskComment {
  id: number;
  comment: string;
  createdAt: string;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  userAvatar: string | null;
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  milestones: Milestone[];
  teamMembers: TeamMember[];
  onTaskUpdated: () => void;
  onTaskDeleted?: () => void;
}

export function TaskDetailModal({
  isOpen,
  onClose,
  task,
  milestones,
  teamMembers,
  onTaskUpdated,
  onTaskDeleted
}: TaskDetailModalProps) {
  if (!isOpen || !task) return null;

  // Local task fields for instant responsiveness
  const [currentTask, setCurrentTask] = useState<Task>(task);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(task.title);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState(task.description || '');

  // Subtasks state
  const [subtasks, setSubtasks] = useState<Subtask[]>(Array.isArray(task.subtasks) ? task.subtasks : []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Comments state
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Timesheets / Logged Hours state
  const [loggedHours, setLoggedHours] = useState<number>(0);
  const [isLoadingTimesheets, setIsLoadingTimesheets] = useState(false);
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [logHoursInput, setLogHoursInput] = useState('1');
  const [logDescInput, setLogDescInput] = useState('');
  const [logDateInput, setLogDateInput] = useState(new Date().toISOString().split('T')[0]);

  // Keep state synchronized if task prop updates
  useEffect(() => {
    setCurrentTask(task);
    setTitleInput(task.title);
    setDescInput(task.description || '');
    setSubtasks(Array.isArray(task.subtasks) ? task.subtasks : []);
  }, [task]);

  // Load comments and timesheets
  useEffect(() => {
    if (task?.id) {
      // 1. Fetch Comments
      setIsLoadingComments(true);
      fetch(`/api/tasks/${task.id}/comments`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setComments(data);
        })
        .catch(err => console.error('Failed to load comments:', err))
        .finally(() => setIsLoadingComments(false));

      // 2. Fetch Logged Timesheets for this task
      setIsLoadingTimesheets(true);
      fetch(`/api/timesheets?taskId=${task.id}`)
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.data)) {
            const sum = data.data.reduce((acc: number, item: any) => {
              return acc + Number(item.timesheet?.hours || 0);
            }, 0);
            setLoggedHours(sum);
          }
        })
        .catch(err => console.error('Failed to load timesheets:', err))
        .finally(() => setIsLoadingTimesheets(false));
    }
  }, [task?.id]);

  // Update Status
  const handleStatusChange = async (newStatus: Task['status']) => {
    setCurrentTask(prev => ({ ...prev, status: newStatus }));
    try {
      const res = await fetch(`/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  // Update Priority
  const handlePriorityChange = async (newPriority: Task['priority']) => {
    setCurrentTask(prev => ({ ...prev, priority: newPriority }));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      });
      if (!res.ok) throw new Error('Failed to update priority');
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  // Update Milestone
  const handleMilestoneChange = async (mIdStr: string) => {
    const newMId = mIdStr ? parseInt(mIdStr) : null;
    const milestoneObj = milestones.find(m => m.id === newMId) || null;
    setCurrentTask(prev => ({ ...prev, milestoneId: newMId, milestone: milestoneObj }));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId: newMId })
      });
      if (!res.ok) throw new Error('Failed to update milestone');
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  // Update Assignee
  const handleAssigneeChange = async (uIdStr: string) => {
    const newUId = uIdStr ? parseInt(uIdStr) : null;
    const memberObj = teamMembers.find(tm => tm.id === newUId) || null;
    setCurrentTask(prev => ({ ...prev, assignedTo: newUId, assignee: memberObj }));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: newUId })
      });
      if (!res.ok) throw new Error('Failed to update assignee');
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  // Save Title
  const handleSaveTitle = async () => {
    if (!titleInput.trim()) return;
    setIsEditingTitle(false);
    setCurrentTask(prev => ({ ...prev, title: titleInput.trim() }));
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleInput.trim() })
      });
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  // Save Description
  const handleSaveDesc = async () => {
    setIsEditingDesc(false);
    setCurrentTask(prev => ({ ...prev, description: descInput.trim() || null }));
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: descInput.trim() || null })
      });
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Subtask
  const handleToggleSubtask = async (subtaskId: string) => {
    const updated = subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    setSubtasks(updated);

    try {
      await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtasks: updated })
      });
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  // Add Subtask
  const handleAddSubtask = async (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    const newSub: Subtask = {
      id: `sub_${Date.now()}_${subtasks.length}`,
      title: newSubtaskTitle.trim(),
      completed: false
    };

    const updated = [...subtasks, newSub];
    setSubtasks(updated);
    setNewSubtaskTitle('');

    try {
      await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtasks: updated })
      });
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  // Remove Subtask
  const handleRemoveSubtask = async (subtaskId: string) => {
    const updated = subtasks.filter(st => st.id !== subtaskId);
    setSubtasks(updated);

    try {
      await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtasks: updated })
      });
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  // Post Discussion Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || isPostingComment) return;
    setIsPostingComment(true);

    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentInput.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post comment');

      if (data.comment) {
        setComments(prev => [...prev, data.comment]);
        setCommentInput('');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  // Log Time against Task
  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const hoursNum = parseFloat(logHoursInput);
    if (isNaN(hoursNum) || hoursNum <= 0) return;

    try {
      const res = await fetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: task.projectId,
          taskId: task.id,
          hours: hoursNum,
          date: logDateInput,
          description: logDescInput.trim() || `Worked on task: ${task.title}`
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to log hours');
      }

      setLoggedHours(prev => prev + hoursNum);
      setIsLoggingTime(false);
      setLogDescInput('');
      alert(`Successfully logged ${hoursNum} hours to task timesheet!`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to log hours');
    }
  };

  // Delete Task
  const handleDeleteTask = async () => {
    if (!window.confirm(`Are you sure you want to delete task "${task.title}"?`)) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
      if (onTaskDeleted) onTaskDeleted();
      onTaskUpdated();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete task');
    }
  };

  const estimatedHoursNum = Number(currentTask.estimatedHours || 0);
  const completedSubtasksCount = subtasks.filter(s => s.completed).length;
  const subtasksTotal = subtasks.length;
  const subtasksProgress = subtasksTotal > 0 ? Math.round((completedSubtasksCount / subtasksTotal) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-[28px] shadow-2xl overflow-hidden border border-slate-200/90 flex flex-col max-h-[92vh] animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Modal Top Navigation */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Dropdown */}
            <select
              value={currentTask.status}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              className={`text-xs font-bold px-3 py-1 rounded-full border cursor-pointer focus:outline-hidden font-heading ${
                currentTask.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : currentTask.status === 'in_progress'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : currentTask.status === 'review'
                  ? 'bg-yellow-50 text-yellow-900 border-yellow-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="completed">Completed</option>
            </select>

            {/* Priority Dropdown */}
            <select
              value={currentTask.priority}
              onChange={(e) => handlePriorityChange(e.target.value as any)}
              className="text-xs font-bold px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer focus:outline-hidden font-heading"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent Priority</option>
            </select>

            {/* Phase Tag */}
            {currentTask.milestone && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/60 font-heading">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>{currentTask.milestone.title}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteTask}
              className="p-1.5 hover:bg-rose-50 rounded-full text-slate-400 hover:text-rose-600 transition-colors"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content (2-Column Layout) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Main Content: Title, Description, Subtasks Checklist, Comments Feed */}
          <div className="lg:col-span-2 p-5 sm:p-6 space-y-6">
            {/* Title */}
            <div>
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                    className="flex-1 font-bold text-lg px-2 py-1 bg-background border border-primary rounded-lg focus:outline-hidden"
                    autoFocus
                  />
                  <button onClick={handleSaveTitle} className="btn-primary text-xs py-1 px-3">
                    Save
                  </button>
                </div>
              ) : (
                <h2 
                  onClick={() => setIsEditingTitle(true)}
                  className="text-xl sm:text-2xl font-bold text-foreground cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
                  title="Click to edit title"
                >
                  <span>{currentTask.title}</span>
                </h2>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Description & Acceptance Criteria
              </span>
              {isEditingDesc ? (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    className="w-full text-xs p-3 bg-background border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-primary"
                    placeholder="Describe task deliverables..."
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setIsEditingDesc(false)} 
                      className="btn-secondary text-xs py-1 px-3"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveDesc} 
                      className="btn-primary text-xs py-1 px-3"
                    >
                      Save Description
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => setIsEditingDesc(true)}
                  className="p-3 bg-secondary/20 hover:bg-secondary/40 border border-border/50 rounded-xl text-xs text-foreground leading-relaxed cursor-pointer transition-colors min-h-[60px]"
                  title="Click to edit description"
                >
                  {currentTask.description || (
                    <span className="text-muted-foreground italic">Add detailed description or acceptance criteria...</span>
                  )}
                </div>
              )}
            </div>

            {/* Actionable Checklist / Subtasks */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  Actionable Checklist ({completedSubtasksCount}/{subtasksTotal})
                </span>
                <span className="text-xs font-bold text-foreground">{subtasksProgress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-300" 
                  style={{ width: `${subtasksProgress}%` }}
                />
              </div>

              {/* Checklist items */}
              <div className="space-y-1.5 pt-1">
                {subtasks.map((st) => (
                  <div 
                    key={st.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 text-xs transition-colors group"
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={() => handleToggleSubtask(st.id)}
                        className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span className={st.completed ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}>
                        {st.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      className="text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add checklist input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add a checklist item (press Enter)..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={handleAddSubtask}
                  className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Discussion & Comments Feed */}
            <div className="space-y-3 pt-4 border-t border-border">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-primary" />
                Discussion & Activity Feed ({comments.length})
              </span>

              {/* Comments Stream */}
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {isLoadingComments ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">Loading discussion...</div>
                ) : comments.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground italic bg-secondary/10 rounded-xl">
                    No comments yet. Start a discussion with your team on this task.
                  </div>
                ) : (
                  comments.map((cmt) => (
                    <div key={cmt.id} className="flex items-start gap-2.5 text-xs">
                      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                        {cmt.userAvatar ? (
                          <img src={cmt.userAvatar} alt={cmt.userName || 'User'} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          (cmt.userName || 'User').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 bg-secondary/30 rounded-xl p-3 border border-border/40 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{cmt.userName || 'Team Member'}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(cmt.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{cmt.comment}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handlePostComment} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Write a comment or update..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim() || isPostingComment}
                  className="btn-primary text-xs py-2 px-3 flex items-center gap-1 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Meta Sidebar: Assignee, Milestone, Dates, Hours & Timesheets */}
          <div className="p-5 sm:p-6 space-y-5 bg-secondary/10">
            {/* Phase / Milestone Selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-primary" /> Phase / Milestone
              </label>
              <select
                value={currentTask.milestoneId?.toString() || ''}
                onChange={(e) => handleMilestoneChange(e.target.value)}
                className="w-full text-xs p-2 bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="">No Milestone (Standalone)</option>
                {milestones.map(m => (
                  <option key={m.id} value={m.id.toString()}>{m.title}</option>
                ))}
              </select>
            </div>

            {/* Assignee Selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5 text-primary" /> Assignee
              </label>
              <select
                value={currentTask.assignedTo?.toString() || ''}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="w-full text-xs p-2 bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="">Unassigned</option>
                {teamMembers.map(tm => (
                  <option key={tm.id} value={tm.id.toString()}>{tm.name}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Due Date
              </label>
              <div className="text-xs text-foreground p-2 bg-background border border-border rounded-lg">
                {currentTask.dueDate 
                  ? new Date(currentTask.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'No deadline set'
                }
              </div>
            </div>

            {/* Time Tracking: Estimated vs Logged Hours */}
            <div className="space-y-3 p-3.5 bg-card border border-border rounded-xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5 text-primary" />
                  Time Tracking
                </span>
                <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                  {isLoadingTimesheets && <Clock className="w-3 h-3 animate-spin text-primary" />}
                  Timesheets
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Logged: <strong className="text-foreground">{loggedHours}h</strong></span>
                  <span className="text-muted-foreground">Estimated: <strong className="text-foreground">{estimatedHoursNum}h</strong></span>
                </div>

                {/* Estimate Comparison Progress Bar */}
                {estimatedHoursNum > 0 && (
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        loggedHours > estimatedHoursNum ? 'bg-rose-500' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(100, Math.round((loggedHours / estimatedHoursNum) * 100))}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Log Time Trigger */}
              {!isLoggingTime ? (
                <button
                  type="button"
                  onClick={() => setIsLoggingTime(true)}
                  className="w-full py-1.5 px-3 text-xs font-semibold rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Time to Task</span>
                </button>
              ) : (
                <form onSubmit={handleLogTime} className="space-y-2 pt-2 border-t border-border">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.25"
                        required
                        value={logHoursInput}
                        onChange={(e) => setLogHoursInput(e.target.value)}
                        className="w-full text-xs p-1.5 bg-background border border-border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Date</label>
                      <input
                        type="date"
                        required
                        value={logDateInput}
                        onChange={(e) => setLogDateInput(e.target.value)}
                        className="w-full text-xs p-1.5 bg-background border border-border rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground">Note (Optional)</label>
                    <input
                      type="text"
                      placeholder="What did you work on?"
                      value={logDescInput}
                      onChange={(e) => setLogDescInput(e.target.value)}
                      className="w-full text-xs p-1.5 bg-background border border-border rounded-md"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setIsLoggingTime(false)}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary text-xs py-1 px-3"
                    >
                      Save Time
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
