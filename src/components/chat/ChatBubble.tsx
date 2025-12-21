import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import bongoLogo from '@/assets/bongo-ai-logo.png';
import { User } from 'lucide-react';

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-in",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center overflow-hidden",
          isUser 
            ? "bg-chat-user" 
            : "bg-gradient-to-br from-primary to-secondary p-0.5"
        )}
      >
        {isUser ? (
          <User className="h-5 w-5 text-chat-user-foreground" />
        ) : (
          <img 
            src={bongoLogo} 
            alt="Bongo AI" 
            className="w-full h-full object-cover rounded-full"
          />
        )}
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-3 shadow-lg",
          isUser 
            ? "bg-chat-user text-chat-user-foreground rounded-br-md" 
            : "bg-chat-ai text-chat-ai-foreground rounded-bl-md border border-primary/20"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        <span className="text-[10px] opacity-60 mt-1 block">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
