import { useState, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { Send, ChevronDown, Paperclip, Mic, Square, X, Loader2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '@/contexts/ChatContext';
import { MODE_INFO, MODEL_INFO, ChatMode, AIModel } from '@/types/chat';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { startSpeechRecognition, stopSpeechRecognition, isSpeechRecognitionSupported } from '@/lib/speechToText';
import { VoiceConversation } from './VoiceConversation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatInputProps {
  onSend: (message: string, images?: string[]) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentMode, currentModel, setCurrentMode, setCurrentModel, isLoading } = useChat();

  const handleSend = () => {
    if ((input.trim() || attachedImages.length > 0) && !isLoading) {
      onSend(input.trim(), attachedImages.length > 0 ? attachedImages : undefined);
      setInput('');
      setAttachedImages([]);
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

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingImage(true);
    
    try {
      const newImages: string[] = [];
      
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file",
            description: "Only image files are supported",
            variant: "destructive"
          });
          continue;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          toast({
            title: "File too large",
            description: "Image must be less than 10MB",
            variant: "destructive"
          });
          continue;
        }

        // Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newImages.push(base64);
      }

      if (newImages.length > 0) {
        setAttachedImages(prev => [...prev, ...newImages].slice(0, 4)); // Max 4 images
        toast({ description: `${newImages.length} image(s) attached` });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image",
        variant: "destructive"
      });
    } finally {
      setIsProcessingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleVoiceInput = async () => {
    if (!isSpeechRecognitionSupported()) {
      toast({
        title: "Not supported",
        description: "Voice input is not supported in your browser",
        variant: "destructive"
      });
      return;
    }

    if (isRecording) {
      stopSpeechRecognition();
      setIsRecording(false);
      return;
    }

    const started = startSpeechRecognition({
      onResult: (transcript) => {
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
      },
      onStart: () => setIsRecording(true),
      onEnd: () => setIsRecording(false),
      onError: (error) => {
        setIsRecording(false);
        toast({
          title: "Voice Error",
          description: error,
          variant: "destructive"
        });
      }
    });

    if (!started) {
      toast({
        title: "Error",
        description: "Failed to start voice recognition",
        variant: "destructive"
      });
    }
  };

  const modes = Object.entries(MODE_INFO) as [ChatMode, typeof MODE_INFO[ChatMode]][];
  const models = Object.entries(MODEL_INFO) as [AIModel, typeof MODEL_INFO[AIModel]][];

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-3xl mx-auto p-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Attached images preview */}
        {attachedImages.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {attachedImages.map((img, index) => (
              <div key={index} className="relative group">
                <img
                  src={img}
                  alt={`Attached ${index + 1}`}
                  className="h-20 w-20 object-cover rounded-lg border border-border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Input container */}
        <div className="relative rounded-2xl border border-border bg-muted/30 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          {/* Top row with dropdowns */}
          <div className="flex items-center gap-2 px-3 pt-3">
            {/* Mode Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "h-7 gap-1.5 text-xs font-medium hover:bg-muted",
                    MODE_INFO[currentMode].color
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-current" />
                  {MODE_INFO[currentMode].label}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {modes.map(([mode, info]) => (
                  <DropdownMenuItem
                    key={mode}
                    onClick={() => setCurrentMode(mode)}
                    className={cn(
                      "cursor-pointer py-2",
                      currentMode === mode && "bg-accent"
                    )}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className={cn("font-medium text-sm", info.color)}>{info.label}</span>
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
                  variant="ghost" 
                  size="sm" 
                  className="h-7 gap-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  {MODEL_INFO[currentModel].label}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {models.map(([model, info]) => (
                  <DropdownMenuItem
                    key={model}
                    onClick={() => setCurrentModel(model)}
                    className={cn(
                      "cursor-pointer py-2",
                      currentModel === model && "bg-accent"
                    )}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm">{info.label}</span>
                      <span className="text-xs text-muted-foreground">{info.description}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Text input */}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={attachedImages.length > 0 ? "Add a message about your image(s)..." : "Type your message..."}
            className="min-h-[60px] max-h-[200px] bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 py-3 px-4 text-foreground placeholder:text-muted-foreground"
            rows={1}
          />

          {/* Bottom row with actions */}
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingImage || attachedImages.length >= 4}
                    >
                      {isProcessingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach image (max 4)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8",
                        isRecording 
                          ? "text-destructive animate-pulse" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={handleVoiceInput}
                    >
                      {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isRecording ? 'Stop recording' : 'Voice input'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>


              {/* Voice conversation button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-primary/10"
                      onClick={() => setShowVoiceChat(true)}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Voice conversation</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Send button */}
            <Button
              size="icon"
              onClick={handleSend}
              disabled={(!input.trim() && attachedImages.length === 0) || isLoading}
              className="h-9 w-9 rounded-xl gradient-bg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Wiser AI can make mistakes. Check important info.
        </p>
      </div>

      {/* Voice Conversation Modal */}
      {showVoiceChat && (
        <VoiceConversation onClose={() => setShowVoiceChat(false)} />
      )}
    </div>
  );
}
