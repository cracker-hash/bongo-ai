import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Calendar, Clock, Plus, Trash2, Edit2, Play, Pause,
  RefreshCw, Timer, Zap, AlertCircle
} from 'lucide-react';
import { useAgentSchedules, AgentSchedule } from '@/hooks/useAgentSchedules';
import { useAuth } from '@/contexts/AuthContext';

const CRON_PRESETS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at 9am', value: '0 9 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Every Monday', value: '0 9 * * 1' },
  { label: 'Every weekday', value: '0 9 * * 1-5' },
  { label: 'Monthly (1st)', value: '0 9 1 * *' },
  { label: 'Custom', value: 'custom' },
];

function describeCron(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const preset = CRON_PRESETS.find(p => p.value === cron);
  if (preset && preset.value !== 'custom') return preset.label;
  return cron;
}

function ScheduleFormDialog({ schedule, onSave, onClose }: {
  schedule?: AgentSchedule;
  onSave: (data: { name: string; description: string; cron_expression: string; taskInput: string; capability?: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(schedule?.name || '');
  const [description, setDescription] = useState(schedule?.description || '');
  const [cronPreset, setCronPreset] = useState(() => {
    if (!schedule) return '0 9 * * *';
    return CRON_PRESETS.find(p => p.value === schedule.cron_expression) ? schedule.cron_expression : 'custom';
  });
  const [customCron, setCustomCron] = useState(schedule?.cron_expression || '');
  const [taskInput, setTaskInput] = useState(schedule?.task_template?.input || '');
  const [capability, setCapability] = useState(schedule?.task_template?.capability || 'general');

  const cronValue = cronPreset === 'custom' ? customCron : cronPreset;

  const handleSubmit = () => {
    if (!name.trim() || !taskInput.trim() || !cronValue.trim()) return;
    onSave({ name, description, cron_expression: cronValue, taskInput, capability });
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{schedule ? 'Edit Schedule' : 'New Automation Schedule'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Daily research update" />
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Summarize AI news every morning" />
        </div>
        <div>
          <Label>Schedule</Label>
          <Select value={cronPreset} onValueChange={setCronPreset}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CRON_PRESETS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {cronPreset === 'custom' && (
            <Input value={customCron} onChange={e => setCustomCron(e.target.value)} placeholder="*/30 * * * *" className="mt-2 font-mono text-sm" />
          )}
        </div>
        <div>
          <Label>Task to execute</Label>
          <Textarea value={taskInput} onChange={e => setTaskInput(e.target.value)} placeholder="Research and summarize the latest AI developments" rows={3} />
        </div>
        <div>
          <Label>Capability</Label>
          <Select value={capability} onValueChange={setCapability}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['general', 'research', 'coding', 'data_analysis', 'automation', 'web_development', 'tutoring', 'creative'].map(c => (
                <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!name.trim() || !taskInput.trim()}>
          {schedule ? 'Update' : 'Create'} Schedule
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function SchedulesPanel() {
  const { isAuthenticated } = useAuth();
  const { schedules, isLoading, loadSchedules, createSchedule, updateSchedule, deleteSchedule, toggleSchedule } = useAgentSchedules();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<AgentSchedule | undefined>();

  useEffect(() => {
    if (isAuthenticated) loadSchedules();
  }, [isAuthenticated, loadSchedules]);

  const handleSave = async (data: { name: string; description: string; cron_expression: string; taskInput: string; capability?: string }) => {
    if (editingSchedule) {
      await updateSchedule(editingSchedule.id, {
        name: data.name,
        description: data.description,
        cron_expression: data.cron_expression,
        task_template: { input: data.taskInput, capability: data.capability },
      });
    } else {
      await createSchedule(data.name, data.description, data.cron_expression, data.taskInput, data.capability);
    }
    setDialogOpen(false);
    setEditingSchedule(undefined);
  };

  const handleEdit = (schedule: AgentSchedule) => {
    setEditingSchedule(schedule);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingSchedule(undefined);
    setDialogOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <Card className="w-full">
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Please sign in to manage automation schedules.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
              <Timer className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Automation Schedules</CardTitle>
              <CardDescription>Recurring agent tasks</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={loadSchedules} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingSchedule(undefined); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1" onClick={handleNew}>
                  <Plus className="h-3.5 w-3.5" />
                  New
                </Button>
              </DialogTrigger>
              <ScheduleFormDialog
                schedule={editingSchedule}
                onSave={handleSave}
                onClose={() => { setDialogOpen(false); setEditingSchedule(undefined); }}
              />
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px]">
          {schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
              <Calendar className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No schedules yet.</p>
              <p className="text-xs mt-1">Create one to automate recurring tasks.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map(schedule => (
                <div key={schedule.id} className="p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{schedule.name}</p>
                        <Badge variant={schedule.is_active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                          {schedule.is_active ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      {schedule.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{schedule.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {describeCron(schedule.cron_expression)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {schedule.run_count} runs
                        </span>
                        {schedule.last_run_at && (
                          <span>Last: {new Date(schedule.last_run_at).toLocaleDateString()}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 mt-1 truncate font-mono">
                        {(schedule.task_template as any)?.input?.slice(0, 80)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Switch
                        checked={schedule.is_active}
                        onCheckedChange={(checked) => toggleSchedule(schedule.id, checked)}
                        className="scale-75"
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(schedule)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteSchedule(schedule.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
