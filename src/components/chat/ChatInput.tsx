import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Mic, ImagePlus, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '@/contexts/ChatContext';
import { MODE_INFO } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { currentMode, isLoading } = useChat();

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  };

  return (
    <div className="p-4 glass-surface border-t border-border/50">
      <div className="max-w-3xl mx-auto">
        {/* Mode indicator */}
        <div className={cn(
          "flex items-center gap-2 mb-2 text-xs",
          MODE_INFO[currentMode].color
        )}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span>{MODE_INFO[currentMode].label} Active</span>
        </div>

        {/* Input container */}
        <div className="relative flex items-end gap-2 bg-muted/50 rounded-2xl border border-border/50 focus-within:border-primary/50 transition-colors p-2">
          {/* Attachment buttons */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary"
            >
              <ImagePlus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </div>

          {/* Text input */}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={`Ask Bongo AI anything in ${MODE_INFO[currentMode].label}...`}
            className="flex-1 min-h-[44px] max-h-[150px] bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 py-3 px-2"
            rows={1}
          />

          {/* Action buttons */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsRecording(!isRecording)}
              className={cn(
                "h-9 w-9 rounded-xl transition-colors",
                isRecording 
                  ? "bg-destructive/20 text-destructive hover:bg-destructive/30" 
                  : "hover:bg-primary/10 hover:text-primary"
              )}
            >
              <Mic className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="h-9 w-9 rounded-xl gradient-bg hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Bongo AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
