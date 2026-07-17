import { useState } from 'react';
import { Plus, Clock, CheckCircle, AlertCircle, Circle } from 'lucide-react';
import { TaskModal } from './TaskModal';

export function ProjectTasks({ projectId, tasks, onTasksUpdate }: { projectId: number, tasks: any[], onTasksUpdate: () => void }) {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-amber-500" />;
      case 'review': return <AlertCircle className="w-5 h-5 text-blue-500" />;
      default: return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'low': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      default: return 'bg-secondary text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-lg">Project Tasks</h3>
          <button 
            onClick={() => setIsTaskModalOpen(true)}
            className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>

        <div className="divide-y divide-border">
          {tasks.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p>No tasks assigned to this project yet.</p>
            </div>
          ) : (
            tasks.map(task => (
              <div key={task.id} className="p-4 hover:bg-secondary/10 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(task.status)}
                  <div>
                    <p className="font-medium">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 max-w-md">{task.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className={`px-2.5 py-0.5 rounded-full border text-xs font-medium capitalize ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  {task.due_date && (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        onSaved={onTasksUpdate}
        preselectedProjectId={projectId}
      />
    </div>
  );
}
