import { useState } from 'react';
import { 
  Plus, 
  Layers, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronRight, 
  Edit2, 
  Trash2, 
  X,
  Sparkles
} from 'lucide-react';
import type { Milestone, Task } from './types';

interface ProjectMilestonesProps {
  projectId: number;
  milestones: Milestone[];
  tasks: Task[];
  onMilestonesUpdate: () => void;
  onOpenAIAssistant?: () => void;
  onTaskClick: (task: Task) => void;
}

export function ProjectMilestones({
  projectId,
  milestones,
  tasks,
  onMilestonesUpdate,
  onOpenAIAssistant,
  onTaskClick
}: ProjectMilestonesProps) {
  const [expandedMilestones, setExpandedMilestones] = useState<Record<number, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<Milestone['status']>('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleExpand = (id: number) => {
    setExpandedMilestones(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreateModal = () => {
    setEditingMilestone(null);
    setTitle('');
    setDescription('');
    setDueDate('');
    setAmount('');
    setStatus('pending');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (m: Milestone, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMilestone(m);
    setTitle(m.title);
    setDescription(m.description || '');
    setDueDate(m.dueDate ? m.dueDate.split('T')[0] : '');
    setAmount(m.amount || '');
    setStatus(m.status);
    setError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this milestone? Associated tasks will remain in the project.')) return;
    try {
      const res = await fetch(`/api/milestones/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete milestone');
      onMilestonesUpdate();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete milestone');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Milestone title is required');
      return;
    }
    setIsSubmitting(true);
    setError('');

    try {
      const url = editingMilestone ? `/api/milestones/${editingMilestone.id}` : '/api/milestones';
      const method = editingMilestone ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: title.trim(),
          description: description.trim() || null,
          dueDate: dueDate || null,
          amount: amount || null,
          status,
          orderIndex: editingMilestone ? editingMilestone.orderIndex : milestones.length
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save milestone');
      }

      setIsModalOpen(false);
      onMilestonesUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Overall calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Overview Progress Card */}
      <div className="bg-white border border-slate-200/90 rounded-[28px] p-6 sm:p-7 shadow-2xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1 font-heading">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>Deliverables Roadmap</span>
            </div>
            <h3 className="font-extrabold text-xl text-slate-900 font-heading">
              Phases & Milestones
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Track multi-stage deliverables, timelines, and progress against completion criteria.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onOpenAIAssistant && (
              <button
                onClick={onOpenAIAssistant}
                className="px-4 py-2.5 rounded-full text-xs font-bold bg-slate-950 hover:bg-slate-800 text-[#FACC15] border border-yellow-400/30 hover:border-yellow-400 shadow-xs hover:shadow flex items-center gap-2 transition-all active:scale-95 font-heading"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FACC15] animate-pulse" />
                <span>AI Breakdown</span>
              </button>
            )}
            <button
              onClick={openCreateModal}
              className="bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-extrabold text-xs py-2.5 px-4 rounded-full flex items-center gap-2 shadow-xs hover:shadow transition-all active:scale-95 font-heading"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Phase</span>
            </button>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-semibold font-heading">Overall Project Completion</span>
            <span className="font-black text-slate-900 font-heading">{overallProgress}% ({completedTasks}/{totalTasks} tasks)</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-400 via-yellow-400 to-[#FACC15] h-full rounded-full transition-all duration-700 ease-out" 
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Milestones List */}
      <div className="space-y-3.5">
        {milestones.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200/90 rounded-[28px] p-12 text-center text-slate-400 space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center mx-auto text-amber-500">
              <Layers className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-base font-heading">No phases defined yet</h4>
            <p className="text-xs max-w-sm mx-auto font-medium text-slate-400">
              Break down this project into phases or milestones to structure your timeline and deliverables.
            </p>
            <div className="flex justify-center gap-2.5 pt-2 flex-wrap">
              {onOpenAIAssistant && (
                <button
                  onClick={onOpenAIAssistant}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-slate-950 text-[#FACC15] border border-yellow-400/30 flex items-center gap-2 shadow-xs font-heading"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FACC15]" /> Auto-Breakdown with AI
                </button>
              )}
              <button
                onClick={openCreateModal}
                className="bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-extrabold text-xs py-2 px-4 rounded-full flex items-center gap-1.5 shadow-xs font-heading"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Create Manually
              </button>
            </div>
          </div>
        ) : (
          milestones.map((milestone, idx) => {
            const milestoneTasks = tasks.filter(t => t.milestoneId === milestone.id);
            const mTotal = milestoneTasks.length;
            const mCompleted = milestoneTasks.filter(t => t.status === 'completed').length;
            const mProgress = mTotal > 0 ? Math.round((mCompleted / mTotal) * 100) : 0;
            const isExpanded = expandedMilestones[milestone.id] ?? true;

            return (
              <div 
                key={milestone.id} 
                className="bg-white border border-slate-200/90 rounded-[22px] shadow-2xs overflow-hidden transition-all"
              >
                {/* Milestone Header Row */}
                <div 
                  onClick={() => toggleExpand(milestone.id)}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <button className="text-slate-400 hover:text-slate-900 mt-0.5 sm:mt-0 p-1 rounded-full hover:bg-slate-100 transition-colors">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black text-slate-950 bg-[#FACC15] px-2.5 py-0.5 rounded-full font-heading shadow-2xs">
                          Phase {idx + 1}
                        </span>
                        <h4 className="font-extrabold text-sm text-slate-900 font-heading">{milestone.title}</h4>
                        <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border font-heading ${
                          milestone.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : milestone.status === 'in_progress'
                            ? 'bg-yellow-50 text-yellow-900 border-yellow-300'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {milestone.status.replace('_', ' ')}
                        </span>
                      </div>
                      {milestone.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1 font-medium">
                          {milestone.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 ml-7 sm:ml-0 text-xs">
                    {milestone.dueDate && (
                      <span className="text-slate-500 font-semibold flex items-center gap-1 font-heading">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        {new Date(milestone.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}

                    {milestone.amount && (
                      <span className="text-slate-700 font-bold flex items-center gap-0.5 font-heading">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        {milestone.amount}
                      </span>
                    )}

                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-amber-400 to-[#FACC15] h-full rounded-full transition-all" 
                          style={{ width: `${mProgress}%` }}
                        />
                      </div>
                      <span className="font-extrabold text-[11px] text-slate-900 font-heading">{mProgress}%</span>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => openEditModal(milestone, e)}
                        className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
                        title="Edit Phase"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(milestone.id, e)}
                        className="p-1.5 hover:bg-rose-50 rounded-full text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Phase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Milestone Tasks Drawer */}
                {isExpanded && (
                  <div className="p-3 bg-slate-50/60 space-y-2">
                    {milestoneTasks.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">
                        No tasks attached to this milestone yet.
                      </div>
                    ) : (
                      milestoneTasks.map(task => (
                        <div
                          key={task.id}
                          onClick={() => onTaskClick(task)}
                          className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200/80 transition-colors cursor-pointer text-xs shadow-2xs group"
                        >
                          <div className="flex items-center gap-2.5">
                            {task.status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span className={`font-semibold font-heading group-hover:text-amber-600 transition-colors ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                              {task.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-muted-foreground">
                            {Number(task.estimatedHours) > 0 && (
                              <span>{Number(task.estimatedHours)}h</span>
                            )}
                            {task.assignee && (
                              <span className="bg-secondary px-2 py-0.5 rounded text-[10px] text-foreground font-medium">
                                {task.assignee.name}
                              </span>
                            )}
                            <span className="capitalize text-[10px] font-semibold">
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Milestone Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl overflow-hidden border border-border flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-base">
                {editingMilestone ? 'Edit Phase / Milestone' : 'Add New Phase / Milestone'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-secondary rounded-full transition-colors text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-lg text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Phase Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Phase 1: Discovery & Architecture"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Description / Deliverables
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of deliverables for this milestone..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Target Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Amount / Budget Allocation ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs py-2 px-4"
                >
                  {isSubmitting ? 'Saving...' : editingMilestone ? 'Update Phase' : 'Create Phase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
