import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Mic, ImagePlus, Paperclip, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { MODE_INFO } from '@/types/chat';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatInputProps {
  onSend: (message: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { currentMode, isLoading } = useChat();
  const { isAuthenticated, setShowAuthModal } = useAuth();

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

  const handleLockedFeature = () => {
    setShowAuthModal(true);
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
          {!isAuthenticated && currentMode !== 'conversation' && (
            <span className="text-muted-foreground">(Guest mode)</span>
          )}
        </div>

        {/* Input container */}
        <div className="relative flex items-end gap-2 bg-muted/50 rounded-2xl border border-border/50 focus-within:border-primary/50 transition-colors p-2">
          {/* Attachment buttons - locked for guests */}
          <TooltipProvider>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-xl",
                      isAuthenticated 
                        ? "hover:bg-primary/10 hover:text-primary" 
                        : "opacity-50 cursor-not-allowed"
                    )}
                    onClick={isAuthenticated ? undefined : handleLockedFeature}
                    disabled={!isAuthenticated}
                  >
                    {!isAuthenticated ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <ImagePlus className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isAuthenticated ? 'Upload image' : 'Sign in to upload images'}
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-xl",
                      isAuthenticated 
                        ? "hover:bg-primary/10 hover:text-primary" 
                        : "opacity-50 cursor-not-allowed"
                    )}
                    onClick={isAuthenticated ? undefined : handleLockedFeature}
                    disabled={!isAuthenticated}
                  >
                    {!isAuthenticated ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Paperclip className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isAuthenticated ? 'Attach file' : 'Sign in to attach files'}
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          {/* Text input */}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={`Ask Bongo AI anything...`}
            className="flex-1 min-h-[44px] max-h-[150px] bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 py-3 px-2 text-foreground placeholder:text-muted-foreground"
            rows={1}
          />

          {/* Action buttons */}
          <TooltipProvider>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={isAuthenticated ? () => setIsRecording(!isRecording) : handleLockedFeature}
                    className={cn(
                      "h-9 w-9 rounded-xl transition-colors",
                      !isAuthenticated 
                        ? "opacity-50 cursor-not-allowed"
                        : isRecording 
                        ? "bg-destructive/20 text-destructive hover:bg-destructive/30" 
                        : "hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {!isAuthenticated ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isAuthenticated ? 'Voice input' : 'Sign in for voice input'}
                </TooltipContent>
              </Tooltip>
              
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="h-9 w-9 rounded-xl gradient-bg hover:opacity-90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TooltipProvider>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Bongo AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
