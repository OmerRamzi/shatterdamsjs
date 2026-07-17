import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  task?: any;
  preselectedProjectId?: number;
}

export function TaskModal({ isOpen, onClose, onSaved, task, preselectedProjectId }: TaskModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    projectId: '',
    status: 'todo',
    dueDate: '',
    assigneeId: ''
  });
  
  const [projects, setProjects] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch('/api/projects').then(res => res.json()),
        fetch('/api/team').then(res => res.json())
      ])
      .then(([projectsData, teamData]) => {
        setProjects(projectsData || []);
        setTeam(teamData || []);
      })
      .catch(err => console.error('Failed to load modal data', err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        projectId: task.project_id || '',
        status: task.status || 'todo',
        dueDate: task.due_date ? task.due_date.split('T')[0] : '',
        assigneeId: task.assignee_id || ''
      });
    } else {
      setFormData({
        title: '',
        projectId: preselectedProjectId ? preselectedProjectId.toString() : '',
        status: 'todo',
        dueDate: '',
        assigneeId: ''
      });
    }
    setError('');
  }, [task, isOpen, preselectedProjectId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const url = task ? `/api/tasks/${task.id}` : '/api/tasks';
      const method = task ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save task');

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold">{task ? 'Edit Task' : 'Create New Task'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
              {error}
            </div>
          )}
          
          <form id="taskForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Task Title *</label>
              <input 
                type="text" 
                name="title"
                value={formData.title} 
                onChange={handleChange}
                required 
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <select
                name="projectId"
                value={formData.projectId}
                onChange={handleChange}
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">No Project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Assignee</label>
                <select
                  name="assigneeId"
                  value={formData.assigneeId}
                  onChange={handleChange}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Unassigned</option>
                  {team.map(member => (
                    <option key={member.id} value={member.id}>{member.displayName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <input 
                  type="date" 
                  name="dueDate"
                  value={formData.dueDate} 
                  onChange={handleChange}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-border bg-secondary/10 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg font-medium hover:bg-secondary transition-colors">
            Cancel
          </button>
          <button 
            type="submit" 
            form="taskForm"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
