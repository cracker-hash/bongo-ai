import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, Play, Pause, RotateCcw, CheckCircle2, XCircle, 
  Loader2, Brain, Eye, Hand, Cog, Search
} from 'lucide-react';
import { ManusAgentRunner, ManusTask } from '@/lib/manus';
import { useToast } from '@/hooks/use-toast';

const phaseIcons = {
  analyze: Brain,
  think: Brain,
  select: Hand,
  execute: Cog,
  observe: Eye,
  complete: CheckCircle2
};

const phaseLabels = {
  analyze: 'Analyzing',
  think: 'Thinking',
  select: 'Selecting Tools',
  execute: 'Executing',
  observe: 'Observing',
  complete: 'Complete'
};

interface ManusPanelProps {
  onClose?: () => void;
}

export function ManusPanel({ onClose }: ManusPanelProps) {
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [tasks, setTasks] = useState<ManusTask[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: boolean; summary: string } | null>(null);
  const { toast } = useToast();

  const phases = ['analyze', 'think', 'select', 'execute', 'observe', 'complete'];

  const handleRun = async () => {
    if (!input.trim()) {
      toast({ title: 'Please enter a task description', variant: 'destructive' });
      return;
    }

    setIsRunning(true);
    setResult(null);
    setTasks([]);
    setProgress(0);

    const runner = new ManusAgentRunner('AutomationAgent', {
      onPhaseChange: (phase) => {
        setCurrentPhase(phase);
        const phaseIndex = phases.indexOf(phase);
        setProgress((phaseIndex + 1) / phases.length * 100);
      },
      onTaskUpdate: (task) => {
        setTasks(prev => {
          const existing = prev.find(t => t.id === task.id);
          if (existing) {
            return prev.map(t => t.id === task.id ? task : t);
          }
          return [...prev, task];
        });
      }
    });

    try {
      const runResult = await runner.run(input);
      setResult(runResult);
      toast({
        title: runResult.success ? 'Automation Complete' : 'Automation Finished with Errors',
        description: runResult.summary
      });
    } catch (error) {
      toast({
        title: 'Automation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setInput('');
    setIsRunning(false);
    setCurrentPhase('');
    setTasks([]);
    setProgress(0);
    setResult(null);
  };

  const getTaskStatusIcon = (status: ManusTask['status']) => {
    switch (status) {
      case 'pending': return <div className="h-4 w-4 rounded-full bg-muted" />;
      case 'running': return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Manus Automation</CardTitle>
              <CardDescription>AI-powered task automation</CardDescription>
            </div>
          </div>
          {currentPhase && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {(() => {
                const PhaseIcon = phaseIcons[currentPhase as keyof typeof phaseIcons] || Brain;
                return <PhaseIcon className="h-3 w-3" />;
              })()}
              {phaseLabels[currentPhase as keyof typeof phaseLabels] || currentPhase}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the task you want to automate..."
            disabled={isRunning}
            onKeyDown={(e) => e.key === 'Enter' && !isRunning && handleRun()}
          />
          <Button
            onClick={handleRun}
            disabled={isRunning || !input.trim()}
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isRunning}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress */}
        {(isRunning || result) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {/* Phase Indicators */}
            <div className="flex items-center justify-between mt-4">
              {phases.slice(0, -1).map((phase, i) => {
                const PhaseIcon = phaseIcons[phase as keyof typeof phaseIcons];
                const isActive = currentPhase === phase;
                const isPast = phases.indexOf(currentPhase) > i;
                
                return (
                  <div key={phase} className="flex flex-col items-center gap-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                      isPast ? 'bg-primary text-primary-foreground' :
                      isActive ? 'bg-primary/20 text-primary ring-2 ring-primary' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      <PhaseIcon className="h-4 w-4" />
                    </div>
                    <span className={`text-xs ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      {phase.charAt(0).toUpperCase() + phase.slice(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tasks */}
        {tasks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Tasks</h4>
            <ScrollArea className="h-40">
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    {getTaskStatusIcon(task.status)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{task.action}</div>
                      {task.error && (
                        <div className="text-xs text-destructive">{task.error}</div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {task.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-destructive/10 border border-destructive/30'}`}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="font-medium">{result.success ? 'Success' : 'Completed with Errors'}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{result.summary}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium mb-3">Quick Automations</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Web Research', icon: Search, task: 'Research the latest AI trends and summarize findings' },
              { label: 'Code Generation', icon: Cog, task: 'Generate a React component for a user dashboard' },
              { label: 'Content Creation', icon: Brain, task: 'Create a blog post outline about productivity' },
              { label: 'Data Analysis', icon: Eye, task: 'Analyze sample data and create a report' }
            ].map((action, i) => (
              <Button
                key={i}
                variant="outline"
                className="justify-start h-auto py-3"
                onClick={() => setInput(action.task)}
                disabled={isRunning}
              >
                <action.icon className="h-4 w-4 mr-2 text-primary" />
                <span className="text-sm">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
