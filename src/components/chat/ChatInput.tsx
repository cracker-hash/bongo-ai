import { useState, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { 
  Send, 
  ChevronDown, 
  Paperclip, 
  Mic, 
  Square, 
  X, 
  Loader2, 
  Phone, 
  FileText,
  Plus,
  Settings2,
  FolderOpen,
  Image as ImageIcon,
  FileUp,
  Figma,
  Mail,
  Calendar,
  Github,
  ExternalLink
} from 'lucide-react';
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// Connected apps for connectors modal
const appConnectors = [
  { name: 'My Browser', description: 'Access web on your own browser', icon: '🌐', isNew: true, connected: false },
  { name: 'Gmail', description: 'Draft replies and summarize emails', icon: Mail, connected: false },
  { name: 'Google Calendar', description: 'Manage events and optimize time', icon: Calendar, connected: false },
  { name: 'Google Drive', description: 'Access and manage documents', icon: FolderOpen, connected: true },
  { name: 'GitHub', description: 'Manage repos and track changes', icon: Github, connected: false },
  { name: 'Notion', description: 'Search and update notes', icon: FileText, connected: false },
];

// API connectors
const apiConnectors = [
  { name: 'OpenAI', description: 'GPT models for text generation', icon: '🤖', connected: true },
  { name: 'ElevenLabs', description: 'Voice cloning and audio', icon: '🔊', connected: true },
  { name: 'Perplexity', description: 'Real-time search answers', icon: '🔍', connected: false },
  { name: 'Stripe API', description: 'Payment and billing', icon: '💳', connected: true },
];

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
  const [showConnectorsModal, setShowConnectorsModal] = useState(false);
  const [connectorSearch, setConnectorSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
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
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        type = 'doc';
        content = await file.text();
      } else {
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

  const handleConnectorClick = (connectorName: string) => {
    toast({
      description: `🔗 Connecting to ${connectorName}...`,
    });
    setShowConnectorsModal(false);
  };

  const filteredApps = appConnectors.filter(c => 
    c.name.toLowerCase().includes(connectorSearch.toLowerCase())
  );
  const filteredAPIs = apiConnectors.filter(c => 
    c.name.toLowerCase().includes(connectorSearch.toLowerCase())
  );

  const modes = Object.entries(MODE_INFO) as [ChatMode, typeof MODE_INFO[ChatMode]][];
  const models = Object.entries(MODEL_INFO) as [AIModel, typeof MODEL_INFO[AIModel]][];

  // Get connected connectors count
  const connectedCount = [...appConnectors, ...apiConnectors].filter(c => c.connected).length;

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-3xl mx-auto p-4">
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          className="hidden"
          onChange={handleDocumentSelect}
        />
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md"
          className="hidden"
          onChange={handleDocumentSelect}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageSelect}
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
                : "Assign a task or ask anything"
            }
            className="min-h-[60px] max-h-[200px] bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 py-4 px-4 text-foreground placeholder:text-muted-foreground"
            rows={1}
          />

          {/* Bottom row with actions */}
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              {/* Plus/Attachment dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                    disabled={isProcessingFile}
                  >
                    {isProcessingFile ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 bg-card border-border">
                  <DropdownMenuItem 
                    className="gap-3 py-2.5 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                    Add from local files
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="gap-3 py-2.5 cursor-pointer"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImageIcon className="h-4 w-4 text-green-500" />
                    Add image
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-3 py-2.5 cursor-pointer">
                    <FolderOpen className="h-4 w-4 text-yellow-500" />
                    Add from Google Drive
                    <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 py-2.5 cursor-pointer">
                    <FileUp className="h-4 w-4 text-blue-500" />
                    Add from OneDrive
                    <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 py-2.5 cursor-pointer">
                    <Figma className="h-4 w-4 text-pink-500" />
                    Import from Figma
                    <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Connectors button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted relative"
                      onClick={() => setShowConnectorsModal(true)}
                    >
                      <Settings2 className="h-5 w-5" />
                      {connectedCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                          {connectedCount}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Connectors ({connectedCount} connected)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Mode Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={cn(
                      "h-8 gap-1.5 text-xs font-medium rounded-full border-primary/50 bg-primary/10 hover:bg-primary/20",
                      MODE_INFO[currentMode].color
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    {MODE_INFO[currentMode].label}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 bg-card border-border">
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
                    className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-full"
                  >
                    {MODEL_INFO[currentModel].label}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 bg-card border-border">
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

            <div className="flex items-center gap-1">
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

              {/* Send button */}
              <Button
                size="icon"
                onClick={handleSend}
                disabled={(!input.trim() && attachedImages.length === 0 && !attachedDocument) || isLoading}
                className="h-9 w-9 rounded-full bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
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

      {/* Connectors Modal */}
      <Dialog open={showConnectorsModal} onOpenChange={setShowConnectorsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] bg-card border-border p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-semibold">Connectors</DialogTitle>
          </DialogHeader>

          {/* Featured connector */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-lg">
                  🌐
                </div>
                <div>
                  <h4 className="font-medium">My Browser</h4>
                  <p className="text-sm text-muted-foreground">
                    Let Wiser AI access your personalized context and perform tasks directly in your browser.
                  </p>
                </div>
              </div>
              <Button className="bg-white text-black hover:bg-white/90">Connect</Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="apps" className="flex-1">
            <div className="px-6 flex items-center justify-between border-b border-border">
              <TabsList className="bg-transparent border-0 p-0 h-auto">
                <TabsTrigger 
                  value="apps" 
                  className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Apps
                </TabsTrigger>
                <TabsTrigger 
                  value="api" 
                  className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Custom API
                </TabsTrigger>
                <TabsTrigger 
                  value="mcp" 
                  className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Custom MCP
                </TabsTrigger>
              </TabsList>
              
              <div className="relative w-48">
                <Input 
                  placeholder="Search connectors..." 
                  className="h-9 bg-muted/50 border-border"
                  value={connectorSearch}
                  onChange={(e) => setConnectorSearch(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="h-[350px]">
              <TabsContent value="apps" className="p-6 pt-4 m-0">
                <div className="grid grid-cols-2 gap-3">
                  {filteredApps.map((connector, index) => (
                    <button
                      key={index}
                      className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors text-left"
                      onClick={() => handleConnectorClick(connector.name)}
                    >
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        {typeof connector.icon === 'string' ? (
                          <span className="text-xl">{connector.icon}</span>
                        ) : (
                          <connector.icon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{connector.name}</h4>
                          {connector.isNew && (
                            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">NEW</span>
                          )}
                          {connector.connected && (
                            <span className="text-xs bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded">Connected</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{connector.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="api" className="p-6 pt-4 m-0">
                <p className="text-sm text-muted-foreground mb-4">
                  🔑 Connect Wiser AI to third-party services using your own API keys.
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors text-left">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-sm">Add custom API</span>
                  </button>
                  
                  {filteredAPIs.map((connector, index) => (
                    <button
                      key={index}
                      className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors text-left"
                      onClick={() => handleConnectorClick(connector.name)}
                    >
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-xl">{connector.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{connector.name}</h4>
                          {connector.connected && (
                            <span className="text-xs bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded">Connected</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{connector.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="mcp" className="p-6 pt-4 m-0">
                <div className="text-center py-8">
                  <Settings2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <h4 className="font-medium mb-2">Custom MCP Connections</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect Wiser AI to custom Model Context Protocol servers
                  </p>
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add MCP Connection
                  </Button>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
