import { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Check, 
  CheckSquare, 
  Square, 
  Layers, 
  Clock, 
  ChevronDown, 
  ChevronRight, 
  Bot, 
  User, 
  RefreshCw, 
  AlertCircle, 
  Trash2
} from 'lucide-react';

interface ProposedTask {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours: number;
  subtasks: string[];
  selected: boolean;
}

interface ProposedMilestone {
  id: string;
  title: string;
  description?: string;
  targetDays?: number;
  tasks: ProposedTask[];
  selected: boolean;
  expanded: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ProjectAISidepanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectTitle: string;
  onBreakdownApplied: () => void;
}

export function ProjectAISidepanel({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  onBreakdownApplied
}: ProjectAISidepanelProps) {
  const [activeView, setActiveView] = useState<'proposal' | 'chat'>('proposal');
  
  // Breakdown & Proposal State
  const [isGenerating, setIsGenerating] = useState(false);
  const [strategySummary, setStrategySummary] = useState<string>('');
  const [proposedMilestones, setProposedMilestones] = useState<ProposedMilestone[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeView === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeView]);

  // Initial welcome message if empty
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome_1',
          role: 'assistant',
          content: `Hi there! I am your Gemini 3 Flash project architect for **${projectTitle}**.\n\nYou can click **"Auto-Breakdown Project"** to decompose this project's brief into actionable milestones, estimates, and checklist subtasks, or chat with me below to refine deliverables.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [isOpen, projectTitle, messages.length]);

  if (!isOpen) return null;

  // Trigger Gemini 3 Flash Breakdown
  const handleGenerateBreakdown = async (customInstructions?: string) => {
    setIsGenerating(true);
    setError(null);
    setApplySuccessMessage(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/ai/breakdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customInstructions })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate AI breakdown');
      }

      if (data.breakdown) {
        setStrategySummary(data.breakdown.summary || '');
        const mapped: ProposedMilestone[] = (data.breakdown.milestones || []).map((m: any, mIdx: number) => ({
          id: `m_${Date.now()}_${mIdx}`,
          title: m.title || `Phase ${mIdx + 1}`,
          description: m.description,
          targetDays: m.targetDays,
          selected: true,
          expanded: true,
          tasks: (m.tasks || []).map((t: any, tIdx: number) => ({
            id: `t_${Date.now()}_${mIdx}_${tIdx}`,
            title: t.title,
            description: t.description,
            priority: t.priority || 'medium',
            estimatedHours: typeof t.estimatedHours === 'number' ? t.estimatedHours : 4,
            subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
            selected: true
          }))
        }));

        setProposedMilestones(mapped);
        setActiveView('proposal');

        // Add assistant note in chat
        setMessages(prev => [
          ...prev,
          {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `✨ I have generated a comprehensive breakdown for **${projectTitle}** with **${mapped.length} phases** and **${mapped.reduce((acc, m) => acc + m.tasks.length, 0)} actionable tasks**.\n\nInspect the proposed deliverables in the **Review & Commit** tab, check/uncheck any items, or tell me here if you'd like any modifications!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err: any) {
      console.error('AI breakdown generation error:', err);
      setError(err.message || 'An error occurred during AI breakdown');
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle milestone selection
  const handleToggleMilestone = (mId: string) => {
    setProposedMilestones(prev => prev.map(m => {
      if (m.id === mId) {
        const nextVal = !m.selected;
        return {
          ...m,
          selected: nextVal,
          tasks: m.tasks.map(t => ({ ...t, selected: nextVal }))
        };
      }
      return m;
    }));
  };

  // Toggle task selection
  const handleToggleTask = (mId: string, tId: string) => {
    setProposedMilestones(prev => prev.map(m => {
      if (m.id === mId) {
        const updatedTasks = m.tasks.map(t => t.id === tId ? { ...t, selected: !t.selected } : t);
        const hasSelected = updatedTasks.some(t => t.selected);
        return {
          ...m,
          selected: hasSelected,
          tasks: updatedTasks
        };
      }
      return m;
    }));
  };

  // Toggle milestone collapse
  const handleToggleExpand = (mId: string) => {
    setProposedMilestones(prev => prev.map(m => 
      m.id === mId ? { ...m, expanded: !m.expanded } : m
    ));
  };

  // Remove proposed task
  const handleRemoveTask = (mId: string, tId: string) => {
    setProposedMilestones(prev => prev.map(m => {
      if (m.id === mId) {
        return {
          ...m,
          tasks: m.tasks.filter(t => t.id !== tId)
        };
      }
      return m;
    }));
  };

  // Apply approved deliverables to project database
  const handleApplyDeliverables = async () => {
    const selectedPhases = proposedMilestones
      .filter(m => m.selected && m.tasks.some(t => t.selected))
      .map(m => ({
        title: m.title,
        description: m.description,
        targetDays: m.targetDays,
        tasks: m.tasks.filter(t => t.selected).map(t => ({
          title: t.title,
          description: t.description,
          priority: t.priority,
          estimatedHours: t.estimatedHours,
          subtasks: t.subtasks
        }))
      }));

    if (selectedPhases.length === 0) {
      setError('Please select at least one task or phase to apply');
      return;
    }

    setIsApplying(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/ai/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestones: selectedPhases })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to apply deliverables');
      }

      setApplySuccessMessage(`Successfully committed ${data.tasksCreated} tasks across ${data.milestonesCreated} milestones to your board!`);
      
      // Notify parent to refresh board
      onBreakdownApplied();

      // Clear proposed deliverables after delay
      setTimeout(() => {
        setProposedMilestones([]);
        setStrategySummary('');
      }, 2500);
    } catch (err: any) {
      console.error('Apply deliverables error:', err);
      setError(err.message || 'Failed to apply deliverables');
    } finally {
      setIsApplying(false);
    }
  };

  // Send message in multi-turn conversational chat
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsChatLoading(true);
    setError(null);

    try {
      // Build history for backend
      const history = messages.slice(-8).map(m => ({
        role: m.role,
        content: m.content
      }));

      // Include current breakdown context if available
      const currentBreakdownPayload = proposedMilestones.length > 0 ? {
        summary: strategySummary,
        milestones: proposedMilestones.map(m => ({
          title: m.title,
          description: m.description,
          tasks: m.tasks.map(t => ({
            title: t.title,
            description: t.description,
            priority: t.priority,
            estimatedHours: t.estimatedHours,
            subtasks: t.subtasks
          }))
        }))
      } : undefined;

      const res = await fetch(`/api/projects/${projectId}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          currentBreakdown: currentBreakdownPayload
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to communicate with AI Assistant');
      }

      // Add Assistant response
      const assistantMsg: ChatMessage = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Request completed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);

      // If Gemini suggested an updated breakdown, update the proposal state!
      if (data.updatedBreakdown && data.updatedBreakdown.milestones) {
        setStrategySummary(data.updatedBreakdown.summary || '');
        const mapped: ProposedMilestone[] = data.updatedBreakdown.milestones.map((m: any, mIdx: number) => ({
          id: `m_${Date.now()}_${mIdx}`,
          title: m.title || `Phase ${mIdx + 1}`,
          description: m.description,
          targetDays: m.targetDays,
          selected: true,
          expanded: true,
          tasks: (m.tasks || []).map((t: any, tIdx: number) => ({
            id: `t_${Date.now()}_${mIdx}_${tIdx}`,
            title: t.title,
            description: t.description,
            priority: t.priority || 'medium',
            estimatedHours: typeof t.estimatedHours === 'number' ? t.estimatedHours : 4,
            subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
            selected: true
          }))
        }));
        setProposedMilestones(mapped);
      }
    } catch (err: any) {
      console.error('AI chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Sorry, I encountered an issue: ${err.message}. Please try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const totalSelectedTasks = proposedMilestones.reduce((acc, m) => 
    acc + m.tasks.filter(t => t.selected).length, 0
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end transition-opacity">
      <div 
        className="w-full sm:w-[520px] lg:w-[600px] h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/90 flex items-center justify-between bg-white/95 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-950 text-[#FACC15] border border-yellow-400/40 flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-[#FACC15]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight font-heading">AI Project Copilot</h3>
                <span className="text-[10px] font-bold bg-yellow-50 text-yellow-900 border border-yellow-300 px-2.5 py-0.5 rounded-full font-heading">
                  Gemini Flash
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[260px] sm:max-w-[340px] font-medium">
                {projectTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="grid grid-cols-2 border-b border-border bg-secondary/30 text-xs font-semibold">
          <button
            onClick={() => setActiveView('proposal')}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeView === 'proposal'
                ? 'border-primary text-primary bg-card'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Review & Commit ({totalSelectedTasks})</span>
          </button>

          <button
            onClick={() => setActiveView('chat')}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeView === 'chat'
                ? 'border-primary text-primary bg-card'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Conversational Copilot</span>
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="m-3 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Success Banner */}
        {applySuccessMessage && (
          <div className="m-3 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg text-xs flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 shrink-0" />
            <span>{applySuccessMessage}</span>
          </div>
        )}

        {/* View 1: Review & Commit Proposed Deliverables */}
        {activeView === 'proposal' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Action Trigger Card */}
            <div className="bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-transparent border border-purple-500/20 rounded-xl p-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    Automated Project Breakdown
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Decompose scope into structured delivery phases, estimated hours, and task checklists.
                  </p>
                </div>
              </div>

              <div className="mt-3.5 flex items-center gap-2">
                <button
                  onClick={() => handleGenerateBreakdown()}
                  disabled={isGenerating}
                  className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Gemini 3 Flash is Thinking & Structuring...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{proposedMilestones.length > 0 ? 'Regenerate Breakdown' : 'Auto-Breakdown Project'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Strategy Summary */}
            {strategySummary && (
              <div className="bg-secondary/40 border border-border/70 rounded-xl p-3.5 text-xs space-y-1">
                <span className="font-bold text-foreground uppercase tracking-wider text-[10px] text-primary">
                  Executive Delivery Strategy
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  {strategySummary}
                </p>
              </div>
            )}

            {/* Proposed Milestones & Tasks Tree */}
            {proposedMilestones.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-semibold text-muted-foreground">
                    Proposed Phases & Tasks ({totalSelectedTasks} selected)
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Review before applying to board
                  </span>
                </div>

                {proposedMilestones.map((milestone) => (
                  <div 
                    key={milestone.id} 
                    className="border border-border rounded-xl bg-card overflow-hidden shadow-xs"
                  >
                    {/* Milestone Header */}
                    <div className="p-3 bg-secondary/30 flex items-center justify-between gap-2 border-b border-border/50">
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleMilestone(milestone.id)}
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          {milestone.selected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleExpand(milestone.id)}
                          className="flex items-center gap-1.5 text-left flex-1"
                        >
                          <span className="font-semibold text-xs text-foreground">
                            {milestone.title}
                          </span>
                          <span className="text-[10px] bg-secondary px-1.5 py-0.2 rounded text-muted-foreground">
                            {milestone.tasks.length} tasks
                          </span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleExpand(milestone.id)}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                      >
                        {milestone.expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Milestone Tasks */}
                    {milestone.expanded && (
                      <div className="divide-y divide-border/40 p-1">
                        {milestone.tasks.map((task) => (
                          <div 
                            key={task.id} 
                            className={`p-2.5 rounded-lg transition-colors text-xs flex items-start justify-between gap-2.5 ${
                              task.selected ? 'hover:bg-secondary/20' : 'opacity-40 hover:opacity-70'
                            }`}
                          >
                            <div className="flex items-start gap-2 flex-1">
                              <button
                                type="button"
                                onClick={() => handleToggleTask(milestone.id, task.id)}
                                className="mt-0.5 text-primary"
                              >
                                {task.selected ? (
                                  <CheckSquare className="w-3.5 h-3.5" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </button>

                              <div className="flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <span className="font-medium text-foreground">{task.title}</span>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                                    task.priority === 'urgent'
                                      ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                      : task.priority === 'high'
                                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                      : 'bg-secondary text-muted-foreground border-border'
                                  }`}>
                                    {task.priority}
                                  </span>
                                  {task.estimatedHours > 0 && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5" />
                                      {task.estimatedHours}h
                                    </span>
                                  )}
                                </div>

                                {task.description && (
                                  <p className="text-[11px] text-muted-foreground line-clamp-2 mb-1.5">
                                    {task.description}
                                  </p>
                                )}

                                {/* Checklist Subtasks Pills */}
                                {task.subtasks && task.subtasks.length > 0 && (
                                  <div className="space-y-0.5 mt-1">
                                    {task.subtasks.map((st, idx) => (
                                      <div key={idx} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                                        <span>{st}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveTask(milestone.id, task.id)}
                              className="text-muted-foreground hover:text-rose-500 p-1 opacity-40 hover:opacity-100 transition-opacity"
                              title="Remove Task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              !isGenerating && (
                <div className="p-8 text-center text-muted-foreground space-y-2 border border-dashed border-border rounded-xl">
                  <Sparkles className="w-8 h-8 mx-auto text-purple-400 opacity-40" />
                  <p className="text-xs">
                    Click <strong>"Auto-Breakdown Project"</strong> above to decompose this project with Gemini 3 Flash.
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {/* View 2: Multi-Turn Conversational Chat */}
        {activeView === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-xl p-3 shadow-xs space-y-1 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground font-medium rounded-tr-none'
                        : 'bg-secondary/60 text-foreground border border-border/60 rounded-tl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>
                    <div className={`text-[9px] ${msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'} text-right`}>
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-foreground shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {isChatLoading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="bg-secondary/60 border border-border/60 rounded-xl rounded-tl-none p-3 text-xs text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:0.4s]" />
                    <span>Gemini 3 Flash is formulating response...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-4 py-2 bg-card border-t border-border/40 flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase shrink-0">Prompts:</span>
              <button
                type="button"
                onClick={() => setInputMessage('Add a dedicated QA & Automated Testing Phase')}
                className="bg-secondary hover:bg-secondary/80 px-2 py-0.5 rounded-full shrink-0 transition-colors text-muted-foreground hover:text-foreground"
              >
                + QA Phase
              </button>
              <button
                type="button"
                onClick={() => setInputMessage('Increase estimated hours for development tasks by 25%')}
                className="bg-secondary hover:bg-secondary/80 px-2 py-0.5 rounded-full shrink-0 transition-colors text-muted-foreground hover:text-foreground"
              >
                + Buffer Hours
              </button>
              <button
                type="button"
                onClick={() => setInputMessage('Add checklist items for production deployment and DNS setup')}
                className="bg-secondary hover:bg-secondary/80 px-2 py-0.5 rounded-full shrink-0 transition-colors text-muted-foreground hover:text-foreground"
              >
                + Deployment Checklist
              </button>
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-card flex items-center gap-2">
              <input
                ref={chatInputRef}
                type="text"
                placeholder="Ask Gemini to refine tasks, adjust estimates, or add requirements..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isChatLoading}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isChatLoading}
                className="btn-primary p-2 rounded-lg disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Drawer Bottom Bar (Apply Deliverables) */}
        {proposedMilestones.length > 0 && (
          <div className="p-4 border-t border-border bg-card/90 backdrop-blur-xs flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-foreground">
                {totalSelectedTasks} Tasks in {proposedMilestones.filter(m => m.selected).length} Phases
              </span>
              <p className="text-[10px] text-muted-foreground">Ready to apply to project</p>
            </div>

            <button
              onClick={handleApplyDeliverables}
              disabled={isApplying || totalSelectedTasks === 0}
              className="py-2 px-4 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isApplying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Committing to Board...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply {totalSelectedTasks} Deliverables to Board</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
