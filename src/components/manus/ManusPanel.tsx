import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, Play, Pause, RotateCcw, CheckCircle2, XCircle, 
  Loader2, Brain, Eye, Hand, Cog, Search, Clock, 
  ListTodo, ChevronRight, StopCircle, RefreshCw, Zap
} from 'lucide-react';
import { useAgentTasks, AgentTask, AgentPhase } from '@/hooks/useAgentTasks';
import { useAuth } from '@/contexts/AuthContext';

const capabilityColors: Record<string, string> = {
  general: 'bg-muted text-muted-foreground',
  data_analysis: 'bg-blue-500/10 text-blue-500',
  web_development: 'bg-purple-500/10 text-purple-500',
  tutoring: 'bg-green-500/10 text-green-500',
  automation: 'bg-orange-500/10 text-orange-500',
  research: 'bg-cyan-500/10 text-cyan-500',
  coding: 'bg-yellow-500/10 text-yellow-500',
  creative: 'bg-pink-500/10 text-pink-500',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  planning: <Brain className="h-4 w-4 text-primary animate-pulse" />,
  executing: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
  paused: <Pause className="h-4 w-4 text-yellow-500" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
  cancelled: <StopCircle className="h-4 w-4 text-muted-foreground" />,
};

interface ManusPanelProps {
  onClose?: () => void;
}

export function ManusPanel({ onClose }: ManusPanelProps) {
  const [input, setInput] = useState('');
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const { isAuthenticated } = useAuth();
  const {
    tasks,
    isLoading,
    activeTaskId,
    loadTasks,
    createTask,
    runTask,
    pauseTask,
    cancelTask,
    getTaskDetail,
  } = useAgentTasks();

  useEffect(() => {
    if (isAuthenticated) {
      loadTasks();
    }
  }, [isAuthenticated, loadTasks]);

  const handleCreate = async () => {
    if (!input.trim()) return;
    const result = await createTask(input);
    if (result) {
      setInput('');
      // Auto-run after creation
      if (result.task?.id) {
        runTask(result.task.id);
      }
    }
  };

  const handleViewDetail = async (task: AgentTask) => {
    const detail = await getTaskDetail(task.id);
    if (detail) setSelectedTask(detail);
  };

  const getPhaseProgress = (task: AgentTask) => {
    const plan = task.agent_plans?.[0];
    if (!plan) return 0;
    return plan.total_phases > 0 ? (plan.current_phase / plan.total_phases) * 100 : 0;
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Wiser AI Agent</CardTitle>
              <CardDescription>Autonomous task planning & execution</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={loadTasks} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Task Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you want the agent to do..."
            disabled={!!activeTaskId}
            onKeyDown={(e) => e.key === 'Enter' && !activeTaskId && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={!!activeTaskId || !input.trim()}>
            {activeTaskId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Research Topic', icon: Search, task: 'Research and summarize the latest developments in AI education' },
            { label: 'Generate Code', icon: Cog, task: 'Create a React component for a user analytics dashboard with charts' },
            { label: 'Study Plan', icon: Brain, task: 'Create a 30-day study plan for learning machine learning from scratch' },
            { label: 'Content Draft', icon: Eye, task: 'Draft a comprehensive blog post about productivity techniques' }
          ].map((action, i) => (
            <Button
              key={i}
              variant="outline"
              className="justify-start h-auto py-2.5 text-xs"
              onClick={() => setInput(action.task)}
              disabled={!!activeTaskId}
            >
              <action.icon className="h-3.5 w-3.5 mr-2 text-primary flex-shrink-0" />
              <span>{action.label}</span>
            </Button>
          ))}
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks">
              <ListTodo className="h-4 w-4 mr-1.5" />
              Tasks ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="detail">
              <Eye className="h-4 w-4 mr-1.5" />
              Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <ScrollArea className="h-[300px]">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                  <Bot className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">No tasks yet. Create one above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleViewDetail(task)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {statusIcons[task.status] || statusIcons.pending}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${capabilityColors[task.capability] || ''}`}>
                                {task.capability}
                              </Badge>
                              {task.agent_plans?.[0] && (
                                <span className="text-[10px] text-muted-foreground">
                                  {task.agent_plans[0].current_phase}/{task.agent_plans[0].total_phases} phases
                                </span>
                              )}
                            </div>
                            {task.status === 'executing' && (
                              <Progress value={getPhaseProgress(task)} className="h-1 mt-2" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {task.status === 'pending' && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); runTask(task.id); }}>
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {task.status === 'executing' && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); pauseTask(task.id); }}>
                              <Pause className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {task.status === 'paused' && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); runTask(task.id); }}>
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {['pending', 'executing', 'paused'].includes(task.status) && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); cancelTask(task.id); }}>
                              <StopCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="detail">
            <ScrollArea className="h-[300px]">
              {selectedTask ? (
                <div className="space-y-4 p-1">
                  <div>
                    <h3 className="font-semibold text-sm">{selectedTask.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{selectedTask.description}</p>
                  </div>

                  {/* Plan Phases */}
                  {selectedTask.agent_plans?.map((plan: any) => (
                    <div key={plan.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Execution Plan {plan.revision_count > 0 && `(Rev ${plan.revision_count})`}
                        </h4>
                        <Badge variant="outline" className="text-[10px]">{plan.status}</Badge>
                      </div>
                      {(plan.phases as AgentPhase[]).map((phase, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded border border-border/50 bg-muted/30">
                          <div className="mt-0.5">
                            {phase.status === 'completed' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> :
                             phase.status === 'running' ? <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" /> :
                             phase.status === 'failed' ? <XCircle className="h-3.5 w-3.5 text-destructive" /> :
                             <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{phase.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{phase.description}</p>
                            {phase.tools.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {phase.tools.map((tool, j) => (
                                  <Badge key={j} variant="secondary" className="text-[9px] px-1 py-0">{tool}</Badge>
                                ))}
                              </div>
                            )}
                            {phase.error && (
                              <p className="text-[10px] text-destructive mt-1">{phase.error}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Execution Logs */}
                  {selectedTask.agent_execution_logs && selectedTask.agent_execution_logs.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Execution Trace</h4>
                      {selectedTask.agent_execution_logs.map((log: any) => (
                        <div key={log.id} className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-muted/30">
                          {log.status === 'success' ? <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" /> : 
                           log.status === 'error' ? <XCircle className="h-3 w-3 text-destructive flex-shrink-0" /> :
                           <Cog className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                          <span className="font-medium">{log.action_type}</span>
                          {log.tool_name && <Badge variant="outline" className="text-[9px] px-1 py-0">{log.tool_name}</Badge>}
                          {log.duration_ms && <span className="text-muted-foreground ml-auto">{log.duration_ms}ms</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Result */}
                  {selectedTask.result && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                      <h4 className="text-xs font-medium text-green-600 mb-1">Result</h4>
                      <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap overflow-auto max-h-32">
                        {JSON.stringify(selectedTask.result, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedTask.error_message && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                      <h4 className="text-xs font-medium text-destructive mb-1">Error</h4>
                      <p className="text-[10px] text-muted-foreground">{selectedTask.error_message}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                  <Eye className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">Select a task to view details</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
