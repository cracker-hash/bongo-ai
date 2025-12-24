import { useState } from 'react';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import bongoLogo from '@/assets/bongo-ai-logo.png';
import { 
  User, 
  Copy, 
  Check, 
  Volume2, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown,
  Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatBubbleProps {
  message: Message;
  onRegenerate?: () => void;
}

export function ChatBubble({ message, onRegenerate }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast({ description: 'Copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(type);
    toast({ 
      description: type === 'up' ? 'Thanks for the feedback!' : 'We\'ll try to improve' 
    });
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
          <User className="h-5 w-5 text-chat-user-foreground" />
        ) : (
          <img 
            src={bongoLogo} 
            alt="Bongo AI" 
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Message content */}
      <div className={cn("flex-1 max-w-[85%] space-y-2", isUser && "flex flex-col items-end")}>
        {/* Name and time */}
        <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", isUser && "flex-row-reverse")}>
          <span className="font-medium">{isUser ? 'You' : 'Bongo AI'}</span>
          <span>·</span>
          <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Message bubble */}
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
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className={cn("action-btn h-8 w-8", isSpeaking && "text-primary")}
              onClick={handleSpeak}
              title="Read aloud"
            >
              <Volume2 className="h-4 w-4" />
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
              className={cn("action-btn h-8 w-8", feedback === 'up' && "text-success")}
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