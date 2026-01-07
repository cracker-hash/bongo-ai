import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CREDIT_COSTS } from '@/lib/creditConfig';
import { 
  MessageSquare, 
  Image, 
  Video, 
  Music, 
  Mic, 
  Drum,
  Globe, 
  Plug, 
  FileText, 
  Podcast,
  Zap
} from 'lucide-react';

const operationIcons: Record<string, React.ReactNode> = {
  task_execution: <Zap className="h-4 w-4" />,
  image_generation: <Image className="h-4 w-4" />,
  video_generation: <Video className="h-4 w-4" />,
  audio_generation: <Mic className="h-4 w-4" />,
  music_generation: <Music className="h-4 w-4" />,
  beats_generation: <Drum className="h-4 w-4" />,
  web_deployment: <Globe className="h-4 w-4" />,
  connector_action: <Plug className="h-4 w-4" />,
  chat_message: <MessageSquare className="h-4 w-4" />,
  document_processing: <FileText className="h-4 w-4" />,
  podcast_generation: <Podcast className="h-4 w-4" />,
};

const operationLabels: Record<string, string> = {
  task_execution: 'Task Execution',
  image_generation: 'Image Generation',
  video_generation: 'Video Generation',
  audio_generation: 'Audio/TTS',
  music_generation: 'Music Generation',
  beats_generation: 'Beats Generation',
  web_deployment: 'Web Deployment',
  connector_action: 'Connector Action',
  chat_message: 'Chat Message',
  document_processing: 'Document Processing',
  podcast_generation: 'Podcast Generation',
};

export function CreditCosts() {
  const sortedCosts = Object.entries(CREDIT_COSTS).sort((a, b) => a[1] - b[1]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Credit Costs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {sortedCosts.map(([operation, cost]) => (
            <div
              key={operation}
              className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                {operationIcons[operation] || <Zap className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {operationLabels[operation] || operation}
                </p>
                <p className="text-xs text-muted-foreground">{cost} credits</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
