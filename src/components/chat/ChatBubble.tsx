import { useState } from 'react';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import wiserLogo from '@/assets/wiser-ai-logo.png';
import { 
  User, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX,
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown,
  Download,
  ZoomIn,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { speak, stopSpeaking, getVoiceSettings } from '@/lib/textToSpeech';
import { submitFeedback } from '@/lib/feedbackAnalytics';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ChatBubbleProps {
  message: Message;
  onRegenerate?: () => void;
}

export function ChatBubble({ message, onRegenerate }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingTTS, setIsLoadingTTS] = useState(false);
  const { currentChatId } = useChat();
  const { user } = useAuth();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast({ description: 'Copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      setIsLoadingTTS(false);
      return;
    }

    const settings = getVoiceSettings();
    
    if (!settings.enabled) {
      toast({ description: 'Voice output is disabled. Enable it in Settings.' });
      return;
    }

    // Show loading immediately for better UX
    setIsLoadingTTS(true);

    speak({
      text: message.content,
      voice: settings.voiceId,
      rate: settings.speed,
      useElevenLabs: settings.useElevenLabs,
      onStart: () => {
        setIsLoadingTTS(false);
        setIsSpeaking(true);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setIsLoadingTTS(false);
      },
      onError: (error) => {
        setIsSpeaking(false);
        setIsLoadingTTS(false);
        toast({ 
          description: error.message || 'Failed to read aloud',
          variant: 'destructive'
        });
      }
    });
  };

  const handleFeedback = async (type: 'up' | 'down') => {
    setFeedback(type);
    
    // Save feedback to analytics
    await submitFeedback({
      messageId: message.id,
      chatId: currentChatId || undefined,
      feedbackType: type === 'up' ? 'positive' : 'negative'
    });
    
    toast({ 
      description: type === 'up' ? 'Thanks for the feedback!' : "We'll try to improve" 
    });
  };

  const handleDownloadImage = async (imageUrl: string) => {
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `wiser-ai-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ description: 'Image downloaded' });
    } catch (error) {
      toast({ description: 'Failed to download image', variant: 'destructive' });
    }
  };

  return (
    <div
      className={cn(
        "group flex gap-4 animate-slide-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center overflow-hidden",
          isUser 
            ? "bg-chat-user" 
            : "bg-muted"
        )}
      >
        {isUser ? (
          user?.avatar ? (
            <img 
              src={user.avatar} 
              alt="You" 
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="h-5 w-5 text-chat-user-foreground" />
          )
        ) : (
          <img 
            src={wiserLogo} 
            alt="Wiser AI" 
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Message content */}
      <div className={cn("flex-1 max-w-[85%] space-y-2", isUser && "flex flex-col items-end")}>
        {/* Name and time */}
        <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", isUser && "flex-row-reverse")}>
          <span className="font-medium">{isUser ? 'You' : 'Wiser AI'}</span>
          <span>·</span>
          <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Attached/Generated Images */}
        {message.images && message.images.length > 0 && (
          <div className={cn("flex gap-2 flex-wrap", isUser && "justify-end")}>
            {message.images.map((img, index) => (
              <Dialog key={index}>
                <DialogTrigger asChild>
                  <div className="relative group/img cursor-pointer">
                    <img
                      src={img.url}
                      alt={`${img.type === 'generated' ? 'Generated' : 'Attached'} image ${index + 1}`}
                      className="max-h-64 max-w-xs rounded-lg border border-border object-cover hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-background/50 rounded-lg">
                      <ZoomIn className="h-6 w-6" />
                    </div>
                    {img.type === 'generated' && (
                      <span className="absolute bottom-2 left-2 text-xs bg-primary/80 text-primary-foreground px-2 py-0.5 rounded">
                        AI Generated
                      </span>
                    )}
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-4xl p-2">
                  <img
                    src={img.url}
                    alt={`${img.type === 'generated' ? 'Generated' : 'Attached'} image ${index + 1}`}
                    className="w-full h-auto rounded-lg"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadImage(img.url)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}

        {/* Message bubble */}
        {message.content && (
          <div
            className={cn(
              "rounded-2xl px-4 py-3 shadow-sm",
              isUser 
                ? "bg-chat-user text-chat-user-foreground rounded-tr-md" 
                : "bg-chat-ai text-chat-ai-foreground rounded-tl-md border border-border/50"
            )}
          >
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            ) : (
              <div className="text-sm markdown-content">
                <ReactMarkdown
                  components={{
                    code({ node, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const isInline = !match;
                      
                      if (isInline) {
                        return (
                          <code className="inline-code" {...props}>
                            {children}
                          </code>
                        );
                      }

                      return (
                        <div className="relative my-4">
                          <div className="flex items-center justify-between bg-muted/80 px-4 py-2 rounded-t-lg border border-border/50">
                            <span className="text-xs text-muted-foreground font-medium">
                              {match[1]}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs hover:bg-background/50"
                              onClick={() => {
                                navigator.clipboard.writeText(String(children));
                                toast({ description: 'Code copied!' });
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              borderTopLeftRadius: 0,
                              borderTopRightRadius: 0,
                              borderBottomLeftRadius: '0.5rem',
                              borderBottomRightRadius: '0.5rem',
                            }}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* AI Message Actions */}
        {!isUser && (
          <div className="message-actions">
            <Button
              variant="ghost"
              size="icon"
              className="action-btn h-8 w-8"
              onClick={handleCopy}
              title="Copy"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className={cn("action-btn h-8 w-8", (isSpeaking || isLoadingTTS) && "text-primary")}
              onClick={handleSpeak}
              title={isSpeaking ? "Stop reading" : isLoadingTTS ? "Loading..." : "Read aloud"}
              disabled={isLoadingTTS}
            >
              {isLoadingTTS ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSpeaking ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            
            {onRegenerate && (
              <Button
                variant="ghost"
                size="icon"
                className="action-btn h-8 w-8"
                onClick={onRegenerate}
                title="Regenerate"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            
            <div className="h-4 w-px bg-border mx-1" />
            
            <Button
              variant="ghost"
              size="icon"
              className={cn("action-btn h-8 w-8", feedback === 'up' && "text-green-500")}
              onClick={() => handleFeedback('up')}
              title="Good response"
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className={cn("action-btn h-8 w-8", feedback === 'down' && "text-destructive")}
              onClick={() => handleFeedback('down')}
              title="Bad response"
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
