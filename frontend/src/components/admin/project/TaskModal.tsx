import { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckSquare, Clock, Flame, Layers, User as UserIcon } from 'lucide-react';
import type { Task, Milestone, TeamMember, Subtask } from './types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  task?: Task | null;
  projectId: number;
  initialStatus?: string;
  milestones: Milestone[];
  teamMembers: TeamMember[];
}

export function TaskModal({
  isOpen,
  onClose,
  onSaved,
  task,
  projectId,
  initialStatus = 'todo',
  milestones,
  teamMembers
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('todo');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [milestoneId, setMilestoneId] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('4');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'todo');
      setPriority(task.priority || 'medium');
      setMilestoneId(task.milestoneId ? task.milestoneId.toString() : '');
      setAssignedTo(task.assignedTo ? task.assignedTo.toString() : '');
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      setEstimatedHours(task.estimatedHours ? Number(task.estimatedHours).toString() : '4');
      setSubtasks(Array.isArray(task.subtasks) ? [...task.subtasks] : []);
    } else {
      setTitle('');
      setDescription('');
      setStatus((initialStatus as any) || 'todo');
      setPriority('medium');
      setMilestoneId('');
      setAssignedTo('');
      setDueDate('');
      setEstimatedHours('4');
      setSubtasks([]);
    }
    setError('');
  }, [task, isOpen, initialStatus]);

  if (!isOpen) return null;

  const handleAddSubtask = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    setSubtasks(prev => [
      ...prev,
      {
        id: `sub_${Date.now()}_${prev.length}`,
        title: newSubtaskTitle.trim(),
        completed: false
      }
    ]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks(prev => prev.map(st => 
      st.id === id ? { ...st, completed: !st.completed } : st
    ));
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(prev => prev.filter(st => st.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const url = task ? `/api/tasks/${task.id}` : '/api/tasks';
      const method = task ? 'PUT' : 'POST';

      const payload = {
        projectId,
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        milestoneId: milestoneId ? parseInt(milestoneId) : null,
        assignedTo: assignedTo ? parseInt(assignedTo) : null,
        dueDate: dueDate || null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : 0,
        subtasks
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save task');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-card w-full max-w-xl rounded-xl shadow-2xl overflow-hidden border border-border flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">
              {task ? 'Edit Task' : 'Create New Task'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-lg text-xs">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Design Wireframes & Component Specs"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary text-sm font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Description & Acceptance Criteria
            </label>
            <textarea
              rows={3}
              placeholder="Detailed description of requirements, deliverables, or links..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary text-sm"
            />
          </div>

          {/* Milestone & Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Phase / Milestone
              </label>
              <select
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary text-sm cursor-pointer"
              >
                <option value="">No Milestone (Standalone)</option>
                {milestones.map(m => (
                  <option key={m.id} value={m.id.toString()}>{m.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5" /> Assigned Team Member
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary text-sm cursor-pointer"
              >
                <option value="">Unassigned</option>
                {teamMembers.map(tm => (
                  <option key={tm.id} value={tm.id.toString()}>{tm.name} ({tm.email})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-2.5 py-2 bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Flame className="w-3 h-3" /> Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-2.5 py-2 bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Estimate (h)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="Hours"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full px-2.5 py-2 bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-2 py-2 bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
              />
            </div>
          </div>

          {/* Subtasks / Checklist section */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-foreground">
                Actionable Checklist ({subtasks.filter(s => s.completed).length}/{subtasks.length})
              </label>
              <span className="text-[11px] text-muted-foreground">Subtask steps</span>
            </div>

            {/* Checklist items */}
            <div className="space-y-1.5 mb-2.5">
              {subtasks.map((st) => (
                <div 
                  key={st.id} 
                  className="flex items-center justify-between gap-2 p-2 bg-secondary/20 hover:bg-secondary/40 rounded-lg text-xs group transition-colors"
                >
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => handleToggleSubtask(st.id)}
                      className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <span className={st.completed ? 'line-through text-muted-foreground' : 'text-foreground'}>
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
            <div className="flex items-center gap-2">
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

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary text-xs py-2 px-4"
            >
              {isSubmitting ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
