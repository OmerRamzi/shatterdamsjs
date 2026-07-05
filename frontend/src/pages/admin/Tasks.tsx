import { useState, useEffect } from 'react';
import { Plus, Search, CheckSquare, Pencil, Trash2 } from "lucide-react";
import { TaskModal } from "../../components/admin/TaskModal";

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tasksRes, projectsRes, teamRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/projects'),
        fetch('/api/team')
      ]);
      const tasksData = await tasksRes.json();
      const projectsData = await projectsRes.json();
      const teamData = await teamRes.json();
      
      setTasks(tasksData || []);
      setProjects(projectsData || []);
      setTeam(teamData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleEdit = (task: any) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete task');
      }
    } catch (error) {
      alert('Error deleting task');
    }
  };

  const getProjectName = (id: number) => {
    const p = projects.find(proj => proj.id === id);
    return p ? p.title : 'No Project';
  };

  const getAssigneeName = (id: number) => {
    const t = team.find(member => member.id === id);
    return t ? t.displayName : 'Unassigned';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
          <p className="text-muted-foreground mt-1">Manage and track organization tasks.</p>
        </div>
        <button onClick={handleAdd} className="btn-primary">
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              className="w-full bg-secondary/50 border-none rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Task</th>
                <th className="px-6 py-4 font-medium">Project</th>
                <th className="px-6 py-4 font-medium">Assignee</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Due Date</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Loading tasks...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <CheckSquare className="w-8 h-8 mb-2 opacity-50" />
                      <p>No tasks found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-3">
                        <CheckSquare className="w-4 h-4 text-primary" />
                        <span>{task.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {getProjectName(task.project_id)}
                    </td>
                    <td className="px-6 py-4">
                      {getAssigneeName(task.assignee_id)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        task.status === 'completed' 
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : task.status === 'in_progress'
                          ? 'bg-blue-500/10 text-blue-500' 
                          : task.status === 'review'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-secondary text-muted-foreground'
                      }`}>
                        {task.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : "Not set"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(task)}
                          className="text-muted-foreground hover:text-primary p-1.5 rounded hover:bg-secondary transition-colors"
                          title="Edit Task"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(task.id)}
                          className="text-muted-foreground hover:text-destructive p-1.5 rounded hover:bg-destructive/10 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchData}
        task={selectedTask}
      />
    </div>
  );
}
