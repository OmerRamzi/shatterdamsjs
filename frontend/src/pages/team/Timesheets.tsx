import { useState, useEffect } from "react";
import { Clock, Plus, Loader2, Save, Trash2 } from "lucide-react";

export default function TeamTimesheetsPage() {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // New Timesheet State
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    projectId: "",
    date: new Date().toISOString().split('T')[0],
    hours: "1",
    description: ""
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tsRes, prjRes] = await Promise.all([
        fetch('/api/timesheets'),
        fetch('/api/projects?status=active')
      ]);
      const tsData = await tsRes.json();
      const prjData = await prjRes.json();
      
      if (tsRes.ok) setTimesheets(tsData.data || []);
      if (prjRes.ok) setProjects(prjData.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.date || !formData.hours) return alert("Please fill all required fields");
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: parseInt(formData.projectId),
          date: formData.date,
          hours: formData.hours,
          description: formData.description
        })
      });
      if (!res.ok) throw new Error("Failed to save timesheet");
      
      setFormData({ ...formData, description: "", hours: "1" });
      setIsAdding(false);
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to submit timesheet");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this timesheet?")) return;
    try {
      const res = await fetch(`/api/timesheets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete timesheet");
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to delete timesheet");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">My Timesheets</h1>
          <p className="text-slate-400 mt-1">Log your work hours for projects.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Log Time
        </button>
      </div>
      
      {isAdding && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-4">Log New Timesheet</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-300">Date *</label>
                <input 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-300">Project *</label>
                <select 
                  required
                  value={formData.projectId}
                  onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select a project...</option>
                  {projects.map((p: any) => (
                    <option key={p.project.id} value={p.project.id}>{p.project.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-300">Hours *</label>
                <input 
                  type="number" step="0.25" min="0.25" required
                  value={formData.hours}
                  onChange={e => setFormData({ ...formData, hours: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-300">Description (Optional)</label>
              <textarea 
                rows={2}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="What did you work on?"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="btn-primary flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
      ) : timesheets.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <Clock className="w-12 h-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-200">No timesheets logged</h3>
          <p className="text-slate-400 mt-2 max-w-sm">You haven't logged any hours yet.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Project</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-center">Hours</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {timesheets.map(({ timesheet, project }) => (
                <tr key={timesheet.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-200 font-medium">
                    {new Date(timesheet.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {project ? project.title : 'Unknown Project'}
                  </td>
                  <td className="px-6 py-4 text-slate-400 truncate max-w-xs">
                    {timesheet.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-center font-medium text-slate-200">
                    {parseFloat(timesheet.hours).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      timesheet.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                      timesheet.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {timesheet.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {timesheet.status === 'pending' && (
                      <button 
                        onClick={() => handleDelete(timesheet.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
