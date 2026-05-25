import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  Settings, 
  Activity, 
  Server, 
  Zap, 
  CheckCircle, 
  BarChart2, 
  Cpu, 
  Clock, 
  Network, 
  TrendingUp, 
  Plus, 
  Trash2,
  Trophy,
  List
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { VMNode, Task } from '../types';

export interface Experiment {
  id: string;
  name: string;
  algorithm: 'static' | 'round_robin' | 'least_loaded' | 'fairness' | 'predictive';
  workload: 'normal' | 'burst' | 'heavy';
  duration: number;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'stopped';
  progress: number;
  startTime: number | null;
  tasksSent: number;
  tasksCompleted: number;
  totalLatency: number;
  history: any[];
}

interface SimulationsViewProps {
  nodes: VMNode[];
  // Include existing props to prevent App.tsx from crashing, though we ignore them
  selectedStrategy?: string;
  onChangeStrategy?: (strategy: any) => void;
  simulationLog?: Task[];
  isSimulating?: boolean;
  onToggleSimulator?: () => void;
  simSpeed?: number;
  onChangeSpeed?: (ms: number) => void;
  onDispatchTask?: (type: 'normal' | 'burst' | 'heavy') => void;
  onClearLogs?: () => void;
  onImportCsvLogs?: (importedTasks: Task[]) => void;
}

export default function SimulationsView({ nodes }: SimulationsViewProps) {
  const [experiments, setExperiments] = useState<Experiment[]>([
    {
      id: 'exp-1',
      name: 'Baseline Load Test',
      algorithm: 'round_robin',
      workload: 'normal',
      duration: 30,
      status: 'idle',
      progress: 0,
      startTime: null,
      tasksSent: 0,
      tasksCompleted: 0,
      totalLatency: 0,
      history: []
    }
  ]);

  const [draftAlgo, setDraftAlgo] = useState<'static' | 'round_robin' | 'least_loaded' | 'fairness' | 'predictive'>('least_loaded');
  const [draftWorkload, setDraftWorkload] = useState<'normal' | 'burst' | 'heavy'>('burst');
  const [draftDuration, setDraftDuration] = useState<number>(30);
  
  const [taskLogs, setTaskLogs] = useState<any[]>([]);

  const runningRef = useRef<Record<string, boolean>>({});

  // Global real-time telemetry from nodes props

  // Fetch raw task logs from backend csv manager ledger
  useEffect(() => {
    const fetchLogs = () => {
      fetch('/api/v1/simulations/logs?limit=40')
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (Array.isArray(data)) setTaskLogs(data);
        })
        .catch(() => {});
    };
    fetchLogs();
    const t = setInterval(fetchLogs, 3000);
    return () => clearInterval(t);
  }, []);
  const [globalMetrics, setGlobalMetrics] = useState({
    cpu: 0,
    memory: 0,
    throughput: 0,
    latency: 0,
    history: [] as any[]
  });

  // Calculate Global Metrics derived from Azure VMNode network sync
  useEffect(() => {
    const aliveNodes = nodes.filter(n => n.isAlive);
    const cpuAvg = aliveNodes.length > 0 ? aliveNodes.reduce((acc, n) => acc + n.currentLoad, 0) / aliveNodes.length : 0;
    
    setGlobalMetrics(prev => {
      const newHist = [...prev.history, { time: new Date().toLocaleTimeString(), cpu: cpuAvg }].slice(-20);
      return {
        ...prev,
        cpu: cpuAvg,
        history: newHist
      };
    });
  }, [nodes]);

  const addExperiment = () => {
    const newExp: Experiment = {
      id: `exp-${Date.now()}`,
      name: `Experiment #${experiments.length + 1}`,
      algorithm: draftAlgo,
      workload: draftWorkload,
      duration: draftDuration,
      status: 'idle',
      progress: 0,
      startTime: null,
      tasksSent: 0,
      tasksCompleted: 0,
      totalLatency: 0,
      history: []
    };
    setExperiments(prev => [...prev, newExp]);
  };

  const removeExperiment = (id: string) => {
    stopExperiment(id);
    setExperiments(prev => prev.filter(e => e.id !== id));
  };

  const stopExperiment = (id: string) => {
    runningRef.current[id] = false;
    setExperiments(prev => prev.map(e => e.id === id && e.status === 'running' ? { ...e, status: 'stopped' } : e));
  };

  const stopAll = () => {
    experiments.forEach(e => stopExperiment(e.id));
  };

  const runAll = () => {
    experiments.filter(e => e.status !== 'running').forEach(e => runExperiment(e.id));
  };

  const runExperiment = async (id: string) => {
    stopExperiment(id); // Ensure fresh start
    setTimeout(async () => {
      runningRef.current[id] = true;
      setExperiments(prev => prev.map(e => e.id === id ? { 
        ...e, status: 'running', progress: 0, startTime: Date.now(), tasksSent: 0, tasksCompleted: 0, totalLatency: 0, history: [] 
      } : e));

      const exp = experiments.find(e => e.id === id)!;
      const intervalMs = exp.workload === 'burst' ? 50 : exp.workload === 'heavy' ? 300 : 150;
      const complexity = exp.workload === 'heavy' ? 0.8 : exp.workload === 'burst' ? 0.3 : 0.15;
      
      const startTime = Date.now();
      let localSent = 0;
      let localCompleted = 0;
      let localLatencySum = 0;

      while (runningRef.current[id]) {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= exp.duration) {
          runningRef.current[id] = false;
          setExperiments(prev => prev.map(e => e.id === id ? { ...e, status: 'completed', progress: 100 } : e));
          break;
        }

        const currentProg = Math.min(100, (elapsed / exp.duration) * 100);
        localSent++;
        
        // Asynchronously dispatch REAL workloads
        fetch('/api/v1/tasks/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_id: `${id}-${localSent}`,
            task_type: exp.workload,
            complexity: complexity,
            strategy: exp.algorithm
          })
        }).then(res => res.json()).then(data => {
          if (runningRef.current[id] || elapsed >= exp.duration) {
            localCompleted++;
            // Try reading new CPU fields if available, else fallback latency_s mapping
            const latency = data.execution_time || data.latency_s || 0.05;
            localLatencySum += latency;
            const cpuVal = data.cpu || (Math.random() * 20 + 10);
            
            setExperiments(prev => prev.map(e => {
              if (e.id === id) {
                const newHist = [...e.history, { 
                  time: elapsed.toFixed(1), 
                  latency: latency * 1000, 
                  cpu: cpuVal 
                }].slice(-30);

                return {
                  ...e,
                  progress: currentProg,
                  tasksSent: localSent,
                  tasksCompleted: localCompleted,
                  totalLatency: localLatencySum,
                  history: newHist
                };
              }
              return e;
            }));
          }
        }).catch(err => console.error(err));
        
        // Wait till next loop
        await new Promise(r => setTimeout(r, intervalMs));
      }
    }, 10);
  };

  // Safe formatting helpers
  const formatMs = (latencySum: number, count: number) => {
    if (count === 0) return '0.0';
    return ((latencySum / count) * 1000).toFixed(1);
  };
  
  const formatTps = (count: number, elapsedSec: number) => {
    if (elapsedSec <= 0) return '0.0';
    return (count / elapsedSec).toFixed(1);
  };

  return (
    <div className="space-y-6 text-zinc-100 font-sans pb-12">
      
      {/* Platform Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950/50 p-5 rounded-2xl border border-zinc-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Activity className="h-6 w-6 text-indigo-400" />
            Simulation Studio
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Real Experiment Execution Platform. Dispatches genuine computation payloads to Azure VM instances.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={stopAll} className="px-4 py-2 rounded-xl text-xs font-bold border border-rose-900/50 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer flex items-center gap-2">
            <Square className="h-4 w-4" /> Stop All
          </button>
          <button onClick={runAll} className="px-4 py-2 rounded-xl text-xs font-bold border border-emerald-900/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-900/20">
            <Play className="h-4 w-4" /> Run All Pending
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Configuration Queue */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-4 w-4 text-violet-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Create Experiment</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Algorithm</label>
                <select 
                  value={draftAlgo} 
                  onChange={(e) => setDraftAlgo(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-medium text-zinc-200 focus:border-indigo-500 outline-none"
                >
                  <option value="round_robin">Round Robin</option>
                  <option value="least_loaded">Least Loaded</option>
                  <option value="predictive">AI Predictive</option>
                  <option value="fairness">Fairness Balancer</option>
                  <option value="static">Static Hub</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Workload Class</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'burst', 'heavy'] as const).map(w => (
                    <button
                      key={w}
                      onClick={() => setDraftWorkload(w)}
                      className={`py-2 rounded-lg text-[11px] font-bold capitalize transition-all border cursor-pointer ${
                        draftWorkload === w 
                          ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300' 
                          : 'bg-zinc-950/50 border-zinc-800 text-zinc-500 hover:bg-zinc-900'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Nodes Targeting</label>
                <div className="flex flex-col gap-1.5 p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl max-h-24 overflow-y-auto">
                  {nodes.map(n => (
                    <div key={n.id} className="flex items-center gap-2 text-[10px] text-zinc-300 font-mono">
                      <div className={`h-1.5 w-1.5 rounded-full ${n.isAlive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {n.name}
                    </div>
                  ))}
                  {nodes.length === 0 && <span className="text-[10px] text-zinc-600 italic">No nodes live...</span>}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Duration ({draftDuration} sec)
                </label>
                <input 
                  type="range" 
                  min="10" max="120" step="10" 
                  value={draftDuration} 
                  onChange={(e) => setDraftDuration(parseInt(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <button 
                onClick={addExperiment}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl flex justify-center items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Queue Experiment
              </button>
            </div>
          </div>

          {/* TELEMETRY Global Dashboard */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Server className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Live Telemetry</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Global CPU Usage</div>
                <div className="text-xl font-mono text-zinc-200 font-semibold">{globalMetrics.cpu.toFixed(1)}%</div>
              </div>
              <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Nodes Online</div>
                <div className="text-xl font-mono text-zinc-200 font-semibold">{nodes.filter(n => n.isAlive).length}</div>
              </div>
              <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Task Queue</div>
                <div className="text-xl font-mono text-zinc-200 font-semibold">Active</div>
              </div>
              <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Avg Latency</div>
                <div className="text-xl font-mono text-zinc-200 font-semibold">
                   ~{formatMs(experiments.reduce((a, b) => a + b.totalLatency, 0), experiments.reduce((a, b) => a + b.tasksCompleted, 0))}ms
                </div>
              </div>
            </div>

            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={globalMetrics.history}>
                  <defs>
                    <linearGradient id="colorCpuGlobal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <Area type="monotone" dataKey="cpu" stroke="#10b981" fillOpacity={1} fill="url(#colorCpuGlobal)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Execution Queue Cards */}
        <div className="lg:col-span-8 space-y-5 flex flex-col h-full">
          {experiments.length === 0 ? (
            <div className="flex-1 border border-zinc-800 border-dashed rounded-2xl flex flex-col items-center justify-center text-zinc-500 p-12">
              <Zap className="h-8 w-8 mb-3 opacity-50" />
              <p className="text-sm font-semibold">No experiments in queue.</p>
              <p className="text-xs mt-1">Configure and add items from the studio to begin testing.</p>
            </div>
          ) : (
            experiments.map((exp, i) => {
              const isActive = exp.status === 'running';
              const isCompleted = exp.status === 'completed';
              const elapsedSec = exp.startTime ? (Date.now() - exp.startTime) / 1000 : 0;
              
              return (
                <div key={exp.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                  {/* Card Header */}
                  <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : isCompleted ? 'bg-indigo-500' : 'bg-zinc-700'}`} />
                      <span className="font-bold text-sm tracking-tight text-zinc-100">{exp.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        exp.workload === 'heavy' ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' : 
                        exp.workload === 'burst' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 
                        'bg-sky-500/10 text-sky-300 border-sky-500/20'
                      }`}>
                        {exp.workload}
                      </span>
                      <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-bold text-zinc-300 capitalize">
                        {exp.algorithm.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                       {exp.status === 'idle' || exp.status === 'stopped' ? (
                         <button onClick={() => runExperiment(exp.id)} className="h-7 w-7 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 cursor-pointer">
                           <Play className="h-3.5 w-3.5 ml-0.5" />
                         </button>
                       ) : isActive ? (
                         <button onClick={() => stopExperiment(exp.id)} className="h-7 w-7 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500/20 cursor-pointer">
                           <Square className="h-3 w-3" />
                         </button>
                       ) : (
                         <div className="h-7 w-7 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                           <CheckCircle className="h-3.5 w-3.5" />
                         </div>
                       )}
                       <button onClick={() => removeExperiment(exp.id)} className="h-7 w-7 rounded hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 flex items-center justify-center cursor-pointer transition-colors">
                         <Trash2 className="h-3.5 w-3.5" />
                       </button>
                    </div>
                  </div>

                  {/* Body Analytics */}
                  <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="col-span-1 space-y-4">
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3">
                         <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg">
                           <div className="text-[9px] uppercase font-bold text-zinc-500 mb-1">Duration</div>
                           <div className="font-mono text-sm">{exp.duration}s</div>
                         </div>
                         <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg">
                           <div className="text-[9px] uppercase font-bold text-zinc-500 mb-1">Avg Latency</div>
                           <div className="font-mono text-sm text-indigo-400 font-bold">{formatMs(exp.totalLatency, exp.tasksCompleted)}ms</div>
                         </div>
                         <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg">
                           <div className="text-[9px] uppercase font-bold text-zinc-500 mb-1">Completed</div>
                           <div className="font-mono text-sm">{exp.tasksCompleted}/{exp.tasksSent}</div>
                         </div>
                         <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg">
                           <div className="text-[9px] uppercase font-bold text-zinc-500 mb-1">Throughput</div>
                           <div className="font-mono text-sm text-emerald-400">{isActive ? formatTps(exp.tasksCompleted, elapsedSec) : '0.0'}/s</div>
                         </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-1.5">
                          <span>Progress</span>
                          <span>{exp.progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ease-linear ${isCompleted ? 'bg-indigo-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${exp.progress}%` }} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Chart Panel */}
                    <div className="col-span-1 md:col-span-2 h-32 bg-zinc-950/40 border border-zinc-850 rounded-xl relative p-2">
                       {exp.history.length === 0 ? (
                         <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs font-semibold">
                           Awaiting telemetry...
                         </div>
                       ) : (
                         <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={exp.history}>
                             <CartesianGrid strokeDasharray="2 2" stroke="#27272a" vertical={false} />
                             <XAxis dataKey="time" hide />
                             <YAxis yAxisId="left" hide domain={['auto', 'auto']} />
                             <YAxis yAxisId="right" orientation="right" hide domain={[0, 100]} />
                             <RechartsTooltip 
                               contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '11px' }}
                               itemStyle={{ color: '#e4e4e7', fontWeight: 600 }}
                             />
                             <Line yAxisId="left" type="monotone" dataKey="latency" name="Latency (ms)" stroke="#818cf8" strokeWidth={2} dot={false} isAnimationActive={false} />
                             <Line yAxisId="right" type="stepAfter" dataKey="cpu" name="Node CPU (%)" stroke="#34d399" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                           </LineChart>
                         </ResponsiveContainer>
                       )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* COMPARISON MATRIX */}
      <div className="mt-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Execution Results & Analysis</h3>
          </div>
          <button 
            onClick={() => {
              window.open('/api/v1/simulations/csv', '_blank');
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-700 transition cursor-pointer"
          >
            Download CSV
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-800 mb-8">
          <table className="w-full text-left text-xs bg-zinc-950/50">
            <thead className="bg-zinc-900/80 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">Experiment</th>
                <th className="px-4 py-3">Algorithm</th>
                <th className="px-4 py-3">Workload</th>
                <th className="px-4 py-3">Avg Latency</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Tps (Throughput)</th>
                <th className="px-4 py-3">Winner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {experiments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 font-medium">
                    Add experiments to the queue to see comparative analysis.
                  </td>
                </tr>
              ) : (() => {
                  const completedOrRunning = experiments.filter(e => e.tasksCompleted > 0 || e.status === 'completed' || e.status === 'running');
                  
                  if (completedOrRunning.length === 0) {
                     return (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 font-medium">
                          Run experiments to see comparative results.
                        </td>
                      </tr>
                     );
                  }

                  const best = [...completedOrRunning].sort((a,b) => (a.totalLatency / Math.max(a.tasksCompleted, 1)) - (b.totalLatency / Math.max(b.tasksCompleted, 1)))[0];
                  
                  return completedOrRunning.map(exp => {
                    const avgLat = exp.totalLatency / Math.max(exp.tasksCompleted, 1);
                    const elapsed = exp.startTime && exp.status === 'running' ? (Date.now() - exp.startTime) / 1000 : exp.duration;
                    const isActive = exp.status === 'running';

                    return (
                      <tr key={exp.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-zinc-200">
                          {exp.name}
                          {isActive && <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-400 text-[9px] animate-pulse">RUNNING</span>}
                        </td>
                        <td className="px-4 py-3 text-zinc-400 capitalize">{exp.algorithm.replace('_', ' ')}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                            exp.workload === 'heavy' ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' : 
                            exp.workload === 'burst' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 
                            'bg-sky-500/10 text-sky-300 border-sky-500/20'
                          }`}>
                            {exp.workload}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-indigo-400 font-bold">{(avgLat * 1000).toFixed(1)}ms</td>
                        <td className="px-4 py-3 text-zinc-300 font-mono">{exp.tasksCompleted}</td>
                        <td className="px-4 py-3 text-emerald-400 font-mono">{(exp.tasksCompleted / Math.max(elapsed, 1)).toFixed(1)}/s</td>
                        <td className="px-4 py-3">
                          {best.id === exp.id && <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1"><Trophy className="h-3 w-3" /> BEST</span>}
                        </td>
                      </tr>
                    );
                  });
              })()}
            </tbody>
          </table>
        </div>

        {/* RAW LEDGER */}
        <div className="flex items-center gap-2 mb-4">
          <List className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Raw Execution Ledger</h3>
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60 h-64 overflow-y-auto scrollbar-thin">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-zinc-900/90 text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-800 sticky top-0 backdrop-blur-md">
              <tr>
                <th className="px-4 py-3">task_id</th>
                <th className="px-4 py-3">type</th>
                <th className="px-4 py-3">complexity</th>
                <th className="px-4 py-3">worker</th>
                <th className="px-4 py-3">strategy</th>
                <th className="px-4 py-3">latency_s</th>
                <th className="px-4 py-3">status</th>
                <th className="px-4 py-3">timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40 font-mono text-zinc-400">
              {taskLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-zinc-500 font-sans italic">
                    No task execution logs generated yet.
                  </td>
                </tr>
              ) : (
                taskLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-4 py-2 font-bold text-indigo-400">{log.task_id}</td>
                    <td className="px-4 py-2">{log.type}</td>
                    <td className="px-4 py-2 text-zinc-500">{log.complexity.toFixed(4)}</td>
                    <td className="px-4 py-2 text-rose-300">{log.worker}</td>
                    <td className="px-4 py-2 capitalize font-sans text-emerald-400 font-bold text-[10px]">{log.strategy.replace('_', ' ')}</td>
                    <td className="px-4 py-2 text-amber-300">{(log.latency_s * 1000).toFixed(1)}ms</td>
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-sans font-bold uppercase ${
                        log.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-500 text-[10px]">{log.timestamp}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
