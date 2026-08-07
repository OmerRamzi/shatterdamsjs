import { useState, useEffect } from "react";
import { Clock, Loader2, CheckCircle, XCircle } from "lucide-react";

export default function AdminTimesheetsPage() {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/timesheets?limit=100');
      const data = await res.json();
      if (res.ok) {
        setTimesheets(data.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (id: number, status: 'approved' | 'rejected') => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/timesheets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to update status");
      
      // Update local state to reflect change without refetching everything
      setTimesheets(timesheets.map(t => 
        t.timesheet.id === id ? { ...t, timesheet: { ...t.timesheet, status } } : t
      ));
    } catch (error) {
      console.error(error);
      alert("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Team Timesheets</h1>
          <p className="text-slate-400 mt-1">Review and manage organization timesheets</p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
      ) : timesheets.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <Clock className="w-12 h-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-200">No timesheets found</h3>
          <p className="text-slate-400 mt-2 max-w-sm">No team members have logged time yet.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Team Member</th>
                  <th className="px-6 py-4">Project</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-center">Hours</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {timesheets.map(({ timesheet, user, project }) => (
                  <tr key={timesheet.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 text-slate-300 font-medium">
                      {new Date(timesheet.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-200 font-medium">
                      {user ? user.name : 'Unknown User'}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {project ? project.title : 'Unknown Project'}
                    </td>
                    <td className="px-6 py-4 text-slate-400 truncate max-w-[200px]" title={timesheet.description}>
                      {timesheet.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-200">
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
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleUpdateStatus(timesheet.id, 'approved')}
                            disabled={updatingId === timesheet.id}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 rounded-lg transition-colors"
                            title="Approve"
                          >
                            {updatingId === timesheet.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(timesheet.id, 'rejected')}
                            disabled={updatingId === timesheet.id}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                            title="Reject"
                          >
                            {updatingId === timesheet.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
