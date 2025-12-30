import { useState, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { Send, ChevronDown, Paperclip, Mic, Square, X, Loader2, Phone, FileText } from 'lucide-react';
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
  onSend: (message: string, images?: string[], document?: { filename: string; content: string; type: string }) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [attachedDocument, setAttachedDocument] = useState<{ filename: string; content: string; type: string } | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const { currentMode, currentModel, setCurrentMode, setCurrentModel, isLoading } = useChat();

  const handleSend = () => {
    if ((input.trim() || attachedImages.length > 0 || attachedDocument) && !isLoading) {
      onSend(
        input.trim(), 
        attachedImages.length > 0 ? attachedImages : undefined,
        attachedDocument || undefined
      );
      setInput('');
      setAttachedImages([]);
      setAttachedDocument(null);
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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  const handleImageSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFile(true);
    
    try {
      const newImages: string[] = [];
      
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file",
            description: "Only image files are supported here",
            variant: "destructive"
          });
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Image must be less than 10MB",
            variant: "destructive"
          });
          continue;
        }

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newImages.push(base64);
      }

      if (newImages.length > 0) {
        setAttachedImages(prev => [...prev, ...newImages].slice(0, 4));
        toast({ description: `${newImages.length} image(s) attached` });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image",
        variant: "destructive"
      });
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDocumentSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    
    try {
      const maxSize = 5 * 1024 * 1024; // 5MB for documents
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Document must be less than 5MB",
          variant: "destructive"
        });
        return;
      }

      let content = '';
      let type = 'txt';

      // Determine file type
      if (file.name.endsWith('.pdf')) {
        type = 'pdf';
        // For PDFs, we'll read as base64 and let the backend process it
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Extract base64 part
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        type = 'doc';
        // Read as text (basic support)
        content = await file.text();
      } else {
        // Plain text files
        type = 'txt';
        content = await file.text();
      }

      setAttachedDocument({
        filename: file.name,
        content,
        type
      });

      toast({ 
        description: `📄 ${file.name} attached`,
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process document",
        variant: "destructive"
      });
    } finally {
      setIsProcessingFile(false);
      if (docInputRef.current) {
        docInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeDocument = () => {
    setAttachedDocument(null);
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
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageSelect}
        />
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md"
          className="hidden"
          onChange={handleDocumentSelect}
        />

        {/* Attached files preview */}
        {(attachedImages.length > 0 || attachedDocument) && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {/* Images */}
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
            
            {/* Document */}
            {attachedDocument && (
              <div className="relative group flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border border-border">
                <FileText className="h-5 w-5 text-primary" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium truncate max-w-[150px]">
                    {attachedDocument.filename}
                  </span>
                  <span className="text-xs text-muted-foreground uppercase">
                    {attachedDocument.type}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-2 hover:bg-destructive/20 hover:text-destructive"
                  onClick={removeDocument}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
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
            placeholder={
              attachedDocument 
                ? `Ask about "${attachedDocument.filename}"...` 
                : attachedImages.length > 0 
                ? "Add a message about your image(s)..." 
                : "Type your message..."
            }
            className="min-h-[60px] max-h-[200px] bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 py-3 px-4 text-foreground placeholder:text-muted-foreground"
            rows={1}
          />

          {/* Bottom row with actions */}
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              {/* Image attachment */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingFile || attachedImages.length >= 4}
                    >
                      {isProcessingFile ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach image (max 4)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Document attachment - highlighted for Study/Quiz modes */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8",
                        (currentMode === 'study' || currentMode === 'quiz') 
                          ? "text-primary hover:text-primary hover:bg-primary/10" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => docInputRef.current?.click()}
                      disabled={isProcessingFile || !!attachedDocument}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {currentMode === 'study' || currentMode === 'quiz' 
                      ? "Upload document for analysis" 
                      : "Attach document (PDF, TXT, DOC)"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Voice input */}
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
              disabled={(!input.trim() && attachedImages.length === 0 && !attachedDocument) || isLoading}
              className="h-9 w-9 rounded-xl gradient-bg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3">
          {currentMode === 'study' || currentMode === 'quiz' 
            ? "📄 Upload documents (PDF, TXT) for personalized learning" 
            : "Wiser AI can make mistakes. Check important info."}
        </p>
      </div>

      {/* Voice Conversation Modal */}
      {showVoiceChat && (
        <VoiceConversation onClose={() => setShowVoiceChat(false)} />
      )}
    </div>
  );
}
