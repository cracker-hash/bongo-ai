import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Upload, 
  FileText, 
  Mic, 
  Download, 
  Play, 
  Pause,
  Sparkles,
  X
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PodcastGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type GenerationStep = 'idle' | 'uploading' | 'extracting' | 'generating-script' | 'generating-audio' | 'complete';
type PodcastMode = 'single' | 'conversation';

const HOST_VOICES = [
  { value: 'host', label: 'Host (Default)', description: 'Natural podcast host voice' },
  { value: 'narrator', label: 'Daniel (Narrator)', description: 'Clear, professional male voice' },
  { value: 'professional', label: 'Roger (Professional)', description: 'Formal business tone' },
  { value: 'engaging', label: 'George (Engaging)', description: 'Warm, friendly voice' },
];

const GUEST_VOICES = [
  { value: 'guest', label: 'Guest (Default)', description: 'Natural guest voice' },
  { value: 'female', label: 'Sarah (Female)', description: 'Clear, professional female voice' },
  { value: 'narrator', label: 'Daniel', description: 'Clear male voice' },
  { value: 'engaging', label: 'George', description: 'Warm male voice' },
];

export function PodcastGeneratorDialog({ open, onOpenChange }: PodcastGeneratorDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [podcastMode, setPodcastMode] = useState<PodcastMode>('conversation');
  const [hostVoice, setHostVoice] = useState('host');
  const [guestVoice, setGuestVoice] = useState('guest');
  const [step, setStep] = useState<GenerationStep>('idle');
  const [progress, setProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [script, setScript] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetState = () => {
    setTitle('');
    setContent('');
    setPodcastMode('conversation');
    setHostVoice('host');
    setGuestVoice('guest');
    setStep('idle');
    setProgress(0);
    setAudioUrl(null);
    setIsPlaying(false);
    setScript(null);
    setFileName(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStep('uploading');
    setProgress(10);

    try {
      // Check if it's a text file
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text();
        setContent(text);
        setStep('idle');
        setProgress(0);
        toast({ title: 'File loaded', description: 'Text content extracted successfully' });
        return;
      }

      // For PDFs, use the process-document edge function
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setStep('extracting');
        setProgress(30);

        // Convert file to base64
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        const { data, error } = await supabase.functions.invoke('process-document', {
          body: { 
            fileBase64: base64,
            fileName: file.name,
            fileType: 'pdf'
          },
        });

        if (error) throw error;

        setContent(data.text || '');
        setStep('idle');
        setProgress(0);
        toast({ title: 'PDF processed', description: 'Text content extracted successfully' });
        return;
      }

      throw new Error('Unsupported file type. Please upload a PDF, TXT, or MD file.');
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process file',
        variant: 'destructive',
      });
      setStep('idle');
      setProgress(0);
    }
  };

  const generatePodcast = async () => {
    if (!content.trim()) {
      toast({
        title: 'Content required',
        description: 'Please enter or upload content for the podcast',
        variant: 'destructive',
      });
      return;
    }

    try {
      setStep('generating-script');
      setProgress(20);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 5;
        });
      }, 1000);

      setStep('generating-audio');
      setProgress(50);

      // Use the new ElevenLabs Studio for conversation podcasts
      const endpoint = podcastMode === 'conversation' ? 'elevenlabs-studio' : 'generate-podcast';
      
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: podcastMode === 'conversation' ? {
          action: 'create-podcast',
          text: content,
          title: title || 'My Podcast',
          mode: podcastMode,
          hostVoice,
          guestVoice,
        } : { 
          text: content,
          title: title || 'My Podcast',
          voice: hostVoice,
        },
      });

      clearInterval(progressInterval);

      if (error) throw error;

      if (!data.audioContent) {
        throw new Error('No audio generated');
      }

      // Convert base64 to blob URL
      const binaryString = atob(data.audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      setAudioUrl(url);
      setScript(data.script);
      setStep('complete');
      setProgress(100);

      toast({
        title: 'Podcast generated!',
        description: 'Your podcast is ready to play and download',
      });
    } catch (error) {
      console.error('Podcast generation error:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate podcast',
        variant: 'destructive',
      });
      setStep('idle');
      setProgress(0);
    }
  };

  const togglePlayback = () => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const downloadPodcast = () => {
    if (!audioUrl) return;

    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `${title || 'podcast'}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStepMessage = () => {
    switch (step) {
      case 'uploading': return 'Uploading file...';
      case 'extracting': return 'Extracting text from document...';
      case 'generating-script': return 'AI is writing your podcast script...';
      case 'generating-audio': return 'Converting script to audio...';
      case 'complete': return 'Your podcast is ready!';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mic className="h-5 w-5 text-primary" />
            Podcast Generator
            <Sparkles className="h-4 w-4 text-yellow-500" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress indicator */}
          {step !== 'idle' && step !== 'complete' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {getStepMessage()}
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {step === 'complete' ? (
            /* Completed state */
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                      <Mic className="h-10 w-10 text-primary" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">{title || 'Your Podcast'}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {podcastMode === 'conversation' 
                    ? `Conversation with ${HOST_VOICES.find(v => v.value === hostVoice)?.label} & ${GUEST_VOICES.find(v => v.value === guestVoice)?.label}`
                    : `Generated with ${HOST_VOICES.find(v => v.value === hostVoice)?.label}`
                  }
                </p>
                
                {/* Audio controls */}
                <div className="flex justify-center gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={togglePlayback}
                    className="min-w-[120px]"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-5 w-5 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 mr-2" />
                        Play
                      </>
                    )}
                  </Button>
                  <Button
                    size="lg"
                    onClick={downloadPodcast}
                    className="min-w-[120px]"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download MP3
                  </Button>
                </div>
              </div>

              {/* Script preview */}
              {script && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Generated Script</Label>
                  <div className="bg-muted/50 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{script}</p>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={resetState}
              >
                Create Another Podcast
              </Button>
            </div>
          ) : (
            /* Input state */
            <>
              {/* Title input */}
              <div className="space-y-2">
                <Label htmlFor="podcast-title">Podcast Title</Label>
                <Input
                  id="podcast-title"
                  placeholder="Enter a title for your podcast"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={step !== 'idle'}
                />
              </div>

              {/* File upload */}
              <div className="space-y-2">
                <Label>Upload Document</Label>
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={step !== 'idle'}
                  />
                  <div className="flex flex-col items-center gap-2">
                    {fileName ? (
                      <>
                        <FileText className="h-8 w-8 text-primary" />
                        <p className="text-sm font-medium">{fileName}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFileName(null);
                            setContent('');
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload PDF, TXT, or MD file
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Or divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or paste content</span>
                </div>
              </div>

              {/* Content textarea */}
              <div className="space-y-2">
                <Label htmlFor="podcast-content">Content</Label>
                <Textarea
                  id="podcast-content"
                  placeholder="Paste your notes, article, or any text you want to convert to a podcast..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[150px] resize-none"
                  disabled={step !== 'idle'}
                />
                <p className="text-xs text-muted-foreground">
                  {content.length} characters
                </p>
              </div>

              {/* Podcast Mode Selection */}
              <div className="space-y-2">
                <Label>Podcast Style</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={podcastMode === 'single' ? 'default' : 'outline'}
                    onClick={() => setPodcastMode('single')}
                    disabled={step !== 'idle'}
                    className="flex flex-col h-auto py-3"
                  >
                    <Mic className="h-5 w-5 mb-1" />
                    <span className="text-xs">Solo Narrator</span>
                  </Button>
                  <Button
                    type="button"
                    variant={podcastMode === 'conversation' ? 'default' : 'outline'}
                    onClick={() => setPodcastMode('conversation')}
                    disabled={step !== 'idle'}
                    className="flex flex-col h-auto py-3"
                  >
                    <Sparkles className="h-5 w-5 mb-1" />
                    <span className="text-xs">Conversation</span>
                  </Button>
                </div>
              </div>

              {/* Voice selection */}
              <div className="space-y-2">
                <Label>{podcastMode === 'conversation' ? 'Host Voice' : 'Voice'}</Label>
                <Select value={hostVoice} onValueChange={setHostVoice} disabled={step !== 'idle'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOST_VOICES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Guest Voice (only for conversation mode) */}
              {podcastMode === 'conversation' && (
                <div className="space-y-2">
                  <Label>Guest Voice</Label>
                  <Select value={guestVoice} onValueChange={setGuestVoice} disabled={step !== 'idle'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GUEST_VOICES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Generate button */}
              <Button
                className="w-full"
                size="lg"
                onClick={generatePodcast}
                disabled={step !== 'idle' || !content.trim()}
              >
                {step !== 'idle' ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate Podcast
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
