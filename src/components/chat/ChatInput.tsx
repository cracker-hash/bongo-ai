import { useState, useRef, KeyboardEvent } from 'react';
import { Send, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '@/contexts/ChatContext';
import { MODE_INFO, MODEL_INFO, ChatMode, AIModel } from '@/types/chat';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatInputProps {
  onSend: (message: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { currentMode, currentModel, setCurrentMode, setCurrentModel, isLoading } = useChat();

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

  const modes = Object.entries(MODE_INFO) as [ChatMode, typeof MODE_INFO[ChatMode]][];
  const models = Object.entries(MODEL_INFO) as [AIModel, typeof MODEL_INFO[AIModel]][];

  return (
    <div className="p-4 glass-surface border-t border-border/50">
      <div className="max-w-3xl mx-auto">
        {/* Dropdowns row */}
        <div className="flex items-center gap-2 mb-2">
          {/* Mode Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "h-8 gap-1 text-xs border-border/50 bg-background hover:bg-muted",
                  MODE_INFO[currentMode].color
                )}
              >
                <span className="w-2 h-2 rounded-full bg-current" />
                {MODE_INFO[currentMode].label}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-popover border-border z-50">
              {modes.map(([mode, info]) => (
                <DropdownMenuItem
                  key={mode}
                  onClick={() => setCurrentMode(mode)}
                  className={cn(
                    "cursor-pointer",
                    currentMode === mode && "bg-accent"
                  )}
                >
                  <div className="flex flex-col">
                    <span className={cn("font-medium", info.color)}>{info.label}</span>
                    <span className="text-xs text-muted-foreground">{info.description}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Model Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-1 text-xs border-border/50 bg-background hover:bg-muted"
              >
                {MODEL_INFO[currentModel].label}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-popover border-border z-50">
              {models.map(([model, info]) => (
                <DropdownMenuItem
                  key={model}
                  onClick={() => setCurrentModel(model)}
                  className={cn(
                    "cursor-pointer",
                    currentModel === model && "bg-accent"
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{info.label}</span>
                    <span className="text-xs text-muted-foreground">{info.description}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Input container */}
        <div className="relative flex items-end gap-2 bg-muted/50 rounded-2xl border border-border/50 focus-within:border-primary/50 transition-colors p-2">
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

          {/* Send button */}
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-9 w-9 rounded-xl gradient-bg hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Bongo AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
