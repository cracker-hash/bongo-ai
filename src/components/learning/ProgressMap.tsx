import { useLearningProgress, LearningTopic } from '@/hooks/useLearningProgress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

function getMasteryColor(level: number) {
  if (level >= 80) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
  if (level >= 50) return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
  return 'text-red-400 bg-red-400/10 border-red-400/30';
}

function getMasteryEmoji(level: number) {
  if (level >= 80) return '🟢';
  if (level >= 50) return '🟡';
  return '🔴';
}

export function ProgressMap() {
  const { topics, isLoading } = useLearningProgress();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No learning progress yet</h3>
        <p className="text-muted-foreground text-sm">Complete quizzes and study sessions to track your mastery.</p>
      </div>
    );
  }

  const avgMastery = Math.round(topics.reduce((sum, t) => sum + t.mastery_level, 0) / topics.length);
  const totalSessions = topics.reduce((sum, t) => sum + t.total_sessions, 0);

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{topics.length}</p>
            <p className="text-xs text-muted-foreground">Topics</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{avgMastery}%</p>
            <p className="text-xs text-muted-foreground">Avg Mastery</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{totalSessions}</p>
            <p className="text-xs text-muted-foreground">Sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Topic grid */}
      <div className="grid gap-3">
        {topics.map((topic) => (
          <Card key={topic.id} className={cn("border", getMasteryColor(topic.mastery_level))}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{getMasteryEmoji(topic.mastery_level)}</span>
                  <span className="font-medium text-sm">{topic.topic}</span>
                </div>
                <Badge variant="outline" className="text-xs">{topic.mastery_level}%</Badge>
              </div>
              <Progress value={topic.mastery_level} className="h-2 mb-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> {topic.total_sessions} sessions
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(topic.last_studied), { addSuffix: true })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
