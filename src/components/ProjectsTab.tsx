import React, { useEffect, useState } from 'react';
import { 
  FolderGit2, ListTodo, Plus, CheckSquare, Clock, 
  Trash2, User, MessageCircle, RefreshCw, Layers 
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled';
  progress: number;
  startDate: string;
  endDate: string;
  ownerName: string;
}

interface Task {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Todo' | 'In Progress' | 'Review' | 'Done';
  assignedToName: string;
  dueDate: string;
  estimatedHours: number;
  loggedHours: number;
}

interface TaskComment {
  id: string;
  taskId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface ProjectsTabProps {
  token: string;
}

export function ProjectsTab({ token }: ProjectsTabProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Focus Task Detail popup
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [logHoursVal, setLogHoursVal] = useState(1);

  // Form creation managers
  const [isAddingProj, setIsAddingProj] = useState(false);
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pStatus, setPStatus] = useState<Project['status']>('Planning');
  const [pStart, setPStart] = useState('');
  const [pEnd, setPEnd] = useState('');

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [tTitle, setTTitle] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tPriority, setTPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [tAssigned, setTAssigned] = useState('');
  const [tDue, setTDue] = useState('');
  const [tEstHours, setTEstHours] = useState(8);

  const [errorMsg, setErrorMsg] = useState('');

  const fetchProjects = async () => {
    try {
      const authHeader = { 'Authorization': `Bearer ${token}` };
      
      const projRes = await fetch('/api/projects', { headers: authHeader });
      const projData = await projRes.json();
      setProjects(projData);

      if (projData.length > 0 && !selectedProject) {
        setSelectedProject(projData[0]);
      }
    } catch (e) {
      console.error('Failed to coordinate project roadmap indexes:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectTasks = async (projId: string) => {
    try {
      const res = await fetch(`/api/projects/${projId}/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      console.error('Failed to draw objectives tasks list:', e);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [token]);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectTasks(selectedProject.id);
    }
  }, [selectedProject]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!pName) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: pName,
          description: pDesc,
          status: pStatus,
          startDate: pStart,
          endDate: pEnd
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize project roadmap.');

      setProjects([...projects, data]);
      setSelectedProject(data);
      setIsAddingProj(false);
      resetProjForm();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!selectedProject || !tTitle) return;

    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: tTitle,
          description: tDesc,
          priority: tPriority,
          status: 'Todo',
          assignedToName: tAssigned,
          dueDate: tDue,
          estimatedHours: Number(tEstHours)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log objective ticketing.');

      setTasks([data, ...tasks]);
      setIsAddingTask(false);
      resetTaskForm();
      
      // Update local project roadmap percentage based on task additions
      fetchProjects();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, nextStatus: Task['status']) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const updated = await res.json();
      setTasks(tasks.map(t => t.id === taskId ? updated : t));
      if (selectedTask?.id === taskId) {
        setSelectedTask(updated);
      }
      
      // Update roadmap completion indicators
      fetchProjects();
    } catch (e) {
      console.error('Failed to shift task status node:', e);
    }
  };

  const handleLogTaskTime = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ loggedHours: Number(logHoursVal) })
      });
      const updated = await res.json();
      setTasks(tasks.map(t => t.id === taskId ? updated : t));
      setSelectedTask(updated);
      setLogHoursVal(1);
    } catch (e) {
      console.error('Failed to log billing hours tracking:', e);
    }
  };

  const resetProjForm = () => {
    setPName('');
    setPDesc('');
    setPStatus('Planning');
  };

  const resetTaskForm = () => {
    setTTitle('');
    setTDesc('');
    setTAssigned('');
  };

  // Kanban splits
  const taskBuckets = { 
    'Todo': tasks.filter(t => t.status === 'Todo'),
    'In Progress': tasks.filter(t => t.status === 'In Progress'),
    'Review': tasks.filter(t => t.status === 'Review'),
    'Done': tasks.filter(t => t.status === 'Done')
  };

  const getPriorityColor = (p: Task['priority']) => {
    switch (p) {
      case 'High': return 'bg-rose-100 text-rose-800';
      case 'Medium': return 'bg-amber-100 text-amber-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div id="projects-viewport" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Task Boards & Project Roadmaps</h1>
          <p className="text-sm text-slate-500">Formulate milestone roadmaps, distribute deliverables, and drag interactive Kanban ticket columns</p>
        </div>
        <div className="flex space-x-2">
          {selectedProject && (
            <button
              id="toggle-add-task"
              onClick={() => setIsAddingTask(!isAddingTask)}
              className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-955 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Issue Ticket</span>
            </button>
          )}

          <button
            id="toggle-add-proj"
            onClick={() => setIsAddingProj(!isAddingProj)}
            className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-blue-100"
          >
            <FolderGit2 className="h-4 w-4" />
            <span>Formulate Roadmap</span>
          </button>
        </div>
      </div>

      {/* Frame Project Roadmap addition form */}
      {isAddingProj && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 animate-fade-in">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Formulate Enterprise Project Outline</h3>
          {errorMsg && <p className="text-xs font-semibold text-rose-500 bg-rose-50 p-2 rounded">{errorMsg}</p>}
          <form onSubmit={handleCreateProject} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium">Roadmap Project Name (*)</label>
              <input
                id="proj-add-name"
                type="text"
                required
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                placeholder="BMS Upgrade Cycle"
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Phase Status</label>
              <select
                id="proj-add-status"
                value={pStatus}
                onChange={(e: any) => setPStatus(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 bg-white rounded-lg text-xs"
              >
                <option value="Planning">Initiation Planning</option>
                <option value="Active">Sprint Active</option>
                <option value="On Hold">Hold Deferred</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Start Date</label>
              <input
                id="proj-add-start"
                type="date"
                value={pStart}
                onChange={(e) => setPStart(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Est Completion Date</label>
              <input
                id="proj-add-end"
                type="date"
                value={pEnd}
                onChange={(e) => setPEnd(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-slate-700 font-medium">Roadmap Objectives Scope Description</label>
              <input
                id="proj-add-desc"
                type="text"
                required
                value={pDesc}
                onChange={(e) => setPDesc(e.target.value)}
                placeholder="Scope statements, goals, deliverables parameters..."
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="md:col-span-4 flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                id="proj-add-cancel"
                type="button"
                onClick={() => setIsAddingProj(false)}
                className="px-4 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                id="proj-add-submit"
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                Formulate Project
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Frame Task objective ticketing addition form */}
      {isAddingTask && selectedProject && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 animate-fade-in">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Issue Ticketing Node - Project: <span className="text-blue-600">{selectedProject.name}</span>
          </h3>
          {errorMsg && <p className="text-xs font-semibold text-rose-500 bg-rose-50 p-2 rounded">{errorMsg}</p>}
          <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-medium">Ticket Title / User Story (*)</label>
              <input
                id="task-add-title"
                type="text"
                required
                value={tTitle}
                onChange={(e) => setTTitle(e.target.value)}
                placeholder="Database schema migrations configuration"
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Assigned Member</label>
              <input
                id="task-add-assigned"
                type="text"
                value={tAssigned}
                onChange={(e) => setTAssigned(e.target.value)}
                placeholder="Sarah Connor"
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Priority Index</label>
              <select
                id="task-add-priority"
                value={tPriority}
                onChange={(e: any) => setTPriority(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 bg-white rounded-lg text-xs"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High Priority</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Est Hours effort</label>
              <input
                id="task-add-hours"
                type="number"
                min="1"
                value={tEstHours}
                onChange={(e) => setTEstHours(Number(e.target.value))}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Ticket Day Due Date</label>
              <input
                id="task-add-due"
                type="date"
                value={tDue}
                onChange={(e) => setTDue(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-medium">Task Implementation description</label>
              <input
                id="task-add-desc"
                type="text"
                value={tDesc}
                onChange={(e) => setTDesc(e.target.value)}
                placeholder="Ensure dependencies are aligned..."
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="md:col-span-4 flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                id="task-add-cancel"
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="px-4 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                id="task-add-submit"
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                Issue Ticket
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Workspace split columns for layouts: Horizontal Project selectors vs Kanban ticket sheets */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Project Selector sidebar area */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-4 lg:col-span-1">
          <div className="border-b border-slate-100 pb-2">
            <h4 className="font-bold text-slate-900 text-sm">Corporate Portfolios</h4>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto" id="projects-selector-list">
            {projects.map(proj => (
              <button
                id={`project-select-${proj.id}`}
                key={proj.id}
                onClick={() => setSelectedProject(proj)}
                className={`w-full text-left p-3 rounded-xl border transition ${selectedProject?.id === proj.id ? 'bg-blue-50 border-blue-200 text-blue-950 font-medium' : 'bg-transparent border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold truncate pr-2">{proj.name}</span>
                  <span className="text-[9px] px-1.5 py-0.25 font-bold uppercase tracking-wider rounded bg-white text-slate-600 border border-slate-200/50">
                    {proj.status}
                  </span>
                </div>
                {/* Horizontal custom percent gauge bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                    <span>Objectives:</span>
                    <span>{proj.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden relative border border-slate-200/50">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${proj.progress}%` }} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Kanban Board view screen */}
        <div className="lg:col-span-3 space-y-4">
          {selectedProject ? (
            <div id="kanban-workspace" className="space-y-4">
              <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm tracking-tight">{selectedProject.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">{selectedProject.description}</p>
                </div>
                <div className="text-right text-[10px] text-slate-400 font-mono">
                  Range: {selectedProject.startDate} to {selectedProject.endDate}
                </div>
              </div>

              {/* Kanban Column Lanes */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(Object.keys(taskBuckets) as Array<keyof typeof taskBuckets>).map(columnName => {
                  const itemsList = taskBuckets[columnName];

                  return (
                    <div key={columnName} id={`kanban-column-${columnName.replace(' ', '-')}`} className="bg-slate-100 rounded-xl p-3 shadow-sm flex flex-col min-h-[400px]">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
                        <span className="text-xs font-bold text-slate-800 tracking-tight">{columnName}</span>
                        <span className="text-[10px] font-bold bg-white text-slate-600 px-1.5 py-0.25 rounded-full border">
                          {itemsList.length}
                        </span>
                      </div>

                      <div className="space-y-2.5 overflow-y-auto flex-1 h-fit pr-0.5">
                        {itemsList.map(item => (
                          <div
                            id={`kanban-task-${item.id}`}
                            key={item.id}
                            onClick={() => setSelectedTask(item)}
                            className="bg-white border select-none border-slate-250 rounded-xl p-3 shadow-sm hover:border-blue-300 transition cursor-pointer space-y-2 group"
                          >
                            <div className="flex items-center justify-between">
                              <span className={`px-1.5 py-0.25 text-[8px] font-bold rounded ${getPriorityColor(item.priority)}`}>
                                {item.priority}
                              </span>
                              <span className="text-[9px] font-mono text-slate-400">Due: {item.dueDate}</span>
                            </div>
                            <h5 className="text-xs font-bold text-slate-900 leading-snug group-hover:text-blue-600">{item.title}</h5>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                              <span className="truncate max-w-[100px] flex items-center">
                                <User className="h-3 w-3 mr-0.5" />
                                {item.assignedToName}
                              </span>
                              <span className="font-mono text-[9px] bg-slate-50 border px-1.5 rounded">
                                {item.loggedHours}/{item.estimatedHours} hrs
                              </span>
                            </div>

                            {/* Transition movements selector helper */}
                            <div className="pt-2 border-t border-slate-100/70 flex justify-end space-x-1" onClick={e => e.stopPropagation()}>
                              {columnName !== 'Todo' && (
                                <button
                                  id={`task-stage-back-${item.id}`}
                                  onClick={() => handleUpdateTaskStatus(item.id, columnName === 'In Progress' ? 'Todo' : columnName === 'Review' ? 'In Progress' : 'Review')}
                                  className="text-[9px] py-0.5 px-1 bg-slate-50 border rounded text-slate-500 hover:bg-slate-100 font-mono font-semibold"
                                >
                                  ←
                                </button>
                              )}
                              {columnName !== 'Done' && (
                                <button
                                  id={`task-stage-forward-${item.id}`}
                                  onClick={() => handleUpdateTaskStatus(item.id, columnName === 'Todo' ? 'In Progress' : columnName === 'In Progress' ? 'Review' : 'Done')}
                                  className="text-[9px] py-0.5 px-1.5 bg-blue-50 border border-blue-100 rounded text-blue-700 hover:bg-blue-100 font-mono font-semibold"
                                >
                                  →
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-sm">
              Please instantiate a corporate project roadmap workspace node to activate Kanban tasks lane blocks.
            </div>
          )}
        </div>
      </div>

      {/* Slide Detailed task objective diagnostic timeline popover */}
      {selectedTask && (
        <div id="task-detail-overlay" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85h]">
            <div className="bg-slate-950 text-white p-4 flex justify-between items-center shrink-0">
              <span className="font-bold text-xs font-mono text-blue-400">TICKET DETECTOR ID: {selectedTask.id.toUpperCase()}</span>
              <button id="close-task-overlay" className="text-slate-400 hover:text-white font-bold" onClick={() => setSelectedTask(null)}>✕</button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <h4 className="text-md font-extrabold text-slate-950">{selectedTask.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{selectedTask.projectName} • Assigned to {selectedTask.assignedToName}</p>
              </div>

              <div className="bg-slate-50 border p-3.5 rounded-xl text-xs text-slate-700 leading-relaxed">
                {selectedTask.description || 'No specialized implementation narrative charted.'}
              </div>

              {/* Log target hours widget */}
              <div className="border-t border-slate-100 pt-3 text-xs space-y-2">
                <span className="font-bold text-slate-900">Track implementation and log hours</span>
                <div className="flex items-center space-x-2">
                  <input
                    id="task-log-hours"
                    type="number"
                    min="1"
                    value={logHoursVal}
                    onChange={(e) => setLogHoursVal(Number(e.target.value))}
                    className="w-24 py-1.5 px-3 border border-slate-300 rounded text-xs text-center h-8 font-bold"
                  />
                  <button
                    id="task-log-hours-submit"
                    onClick={() => handleLogTaskTime(selectedTask.id)}
                    className="h-8 bg-slate-800 hover:bg-slate-900 px-4 text-white font-semibold rounded text-xs transition"
                  >
                    Log Hours
                  </button>
                  <span className="text-[11px] font-mono text-slate-400 pl-2">Logged Effort: {selectedTask.loggedHours} / {selectedTask.estimatedHours} hrs</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  id="task-overlay-close-btn"
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs"
                >
                  Return to Board
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
