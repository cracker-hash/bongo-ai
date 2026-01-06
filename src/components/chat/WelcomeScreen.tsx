import { useState } from 'react';
import { 
  Sparkles, 
  Globe, 
  Code2, 
  Palette, 
  MoreHorizontal,
  Plus,
  Settings2,
  Paperclip,
  FolderOpen,
  FileImage,
  Mic,
  Send,
  ChevronDown,
  ExternalLink,
  X,
  Search,
  Mail,
  Calendar,
  Github,
  Slack,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMode } from '@/types/chat';
import wiserLogo from '@/assets/wiser-ai-logo.png';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';

// Quick action buttons
const quickActions = [
  { icon: FileText, label: 'Create slides', color: 'text-blue-400' },
  { icon: Globe, label: 'Build website', color: 'text-cyan-400' },
  { icon: Code2, label: 'Develop apps', color: 'text-green-400' },
  { icon: Palette, label: 'Design', color: 'text-purple-400' },
  { icon: MoreHorizontal, label: 'More', color: 'text-muted-foreground' },
];

// App connectors
const appConnectors = [
  { name: 'My Browser', description: 'Access web on your own browser', icon: '🌐', isNew: true },
  { name: 'Gmail', description: 'Draft replies and summarize emails', icon: Mail },
  { name: 'Google Calendar', description: 'Manage events and optimize time', icon: Calendar },
  { name: 'Google Drive', description: 'Access and manage documents', icon: FolderOpen },
  { name: 'GitHub', description: 'Manage repos and track changes', icon: Github },
  { name: 'Slack', description: 'Track conversations and messages', icon: Slack },
  { name: 'Notion', description: 'Search and update notes', icon: FileText },
];

// Custom API connectors
const apiConnectors = [
  { name: 'OpenAI', description: 'GPT models for text generation', icon: '🤖' },
  { name: 'Anthropic', description: 'Safe AI assistant services', icon: '🅰️' },
  { name: 'Google Gemini', description: 'Multimodal content processing', icon: '✨' },
  { name: 'ElevenLabs', description: 'Voice cloning and audio', icon: '🔊' },
  { name: 'Perplexity', description: 'Real-time search answers', icon: '🔍' },
  { name: 'Stripe API', description: 'Payment and billing management', icon: '💳' },
];

interface WelcomeScreenProps {
  onPromptClick: (prompt: string, mode: ChatMode) => void;
}

export function WelcomeScreen({ onPromptClick }: WelcomeScreenProps) {
  const { isAuthenticated, setShowAuthModal, user } = useAuth();
  const [showConnectors, setShowConnectors] = useState(false);
  const [connectorSearch, setConnectorSearch] = useState('');

  const handleQuickAction = (label: string) => {
    const prompts: Record<string, string> = {
      'Create slides': 'Help me create a professional presentation about',
      'Build website': 'Help me build a modern website for',
      'Develop apps': 'Help me develop an application that',
      'Design': 'Help me design a creative solution for',
    };
    if (prompts[label]) {
      onPromptClick(prompts[label], 'creative');
    }
  };

  const filteredApps = appConnectors.filter(c => 
    c.name.toLowerCase().includes(connectorSearch.toLowerCase())
  );
  const filteredAPIs = apiConnectors.filter(c => 
    c.name.toLowerCase().includes(connectorSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-8 px-4 animate-fade-in">
      {/* Plan Badge */}
      <div className="flex items-center gap-2 mb-8">
        <span className="text-sm text-muted-foreground">Free plan</span>
        <span className="text-muted-foreground">|</span>
        <Button variant="link" className="text-primary p-0 h-auto text-sm font-medium">
          Upgrade
        </Button>
      </div>

      {/* Main Heading */}
      <h1 className="text-4xl md:text-5xl font-serif font-normal mb-12 text-center text-foreground italic">
        What can I do for you?
      </h1>

      {/* Input Container */}
      <div className="w-full max-w-2xl space-y-4">
        {/* Main Input Box */}
        <div className="relative rounded-2xl border border-border bg-card overflow-hidden">
          {/* Text area placeholder */}
          <div className="px-4 py-4 min-h-[80px]">
            <p className="text-muted-foreground">Assign a task or ask anything</p>
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
            <div className="flex items-center gap-1">
              {/* Add files dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                    <Plus className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-card border-border">
                  <DropdownMenuItem className="gap-3 py-2.5">
                    <Paperclip className="h-4 w-4" />
                    Add from local files
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 py-2.5">
                    <FolderOpen className="h-4 w-4 text-yellow-500" />
                    Add from Google Drive files
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 py-2.5">
                    <FileImage className="h-4 w-4 text-blue-500" />
                    Add from OneDrive files
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 py-2.5">
                    <Palette className="h-4 w-4 text-pink-500" />
                    Add from Figma
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Connectors dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                    <Settings2 className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 bg-card border-border">
                  <DropdownMenuItem className="gap-3 py-2.5">
                    <Globe className="h-4 w-4" />
                    My Browser
                    <span className="ml-auto text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">NEW</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-3 py-2.5">
                    <Mail className="h-4 w-4 text-red-400" />
                    Gmail
                    <span className="ml-auto text-xs text-muted-foreground">Connect</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 py-2.5">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    Google Calendar
                    <span className="ml-auto text-xs text-muted-foreground">Connect</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 py-2.5">
                    <FolderOpen className="h-4 w-4 text-yellow-500" />
                    Google Drive
                    <span className="ml-auto text-xs text-muted-foreground">Connect</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 py-2.5">
                    <Github className="h-4 w-4" />
                    GitHub
                    <span className="ml-auto text-xs text-muted-foreground">Connect</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="gap-3 py-2.5"
                    onClick={() => setShowConnectors(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add connectors
                    <span className="ml-auto text-xs text-muted-foreground">+45</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2">
              {/* Voice button */}
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                <Mic className="h-5 w-5" />
              </Button>
              
              {/* Send button */}
              <Button 
                size="icon" 
                className="h-9 w-9 rounded-full bg-muted hover:bg-muted/80"
                disabled
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Connect tools row */}
        <div className="flex items-center justify-between px-1">
          <button 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowConnectors(true)}
          >
            <Settings2 className="h-4 w-4" />
            Connect your tools to Wiser AI
          </button>
          <div className="flex items-center gap-1">
            {['🌐', '📧', '📅', '📁', '🔗', '📝'].map((emoji, i) => (
              <span key={i} className="text-sm">{emoji}</span>
            ))}
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <X className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-10 px-4 gap-2 rounded-full bg-card border-border hover:bg-muted transition-all"
              onClick={() => handleQuickAction(action.label)}
            >
              <action.icon className={cn("h-4 w-4", action.color)} />
              <span className="text-sm">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Feature cards */}
        <div className="mt-8 space-y-3">
          <div className="bg-card rounded-xl p-4 border border-border flex items-center gap-4">
            <div className="flex-1">
              <h3 className="font-medium text-foreground mb-1">Build your full-stack web app</h3>
              <p className="text-sm text-muted-foreground">
                Build your first AI-native web apps and claim 1 trillion LLM tokens
              </p>
            </div>
            <div className="w-24 h-16 rounded-lg bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="text-xs text-white font-medium">AI website builder</span>
            </div>
          </div>

          {/* Carousel dots */}
          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
            <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
          </div>
        </div>
      </div>

      {/* Connectors Modal */}
      <Dialog open={showConnectors} onOpenChange={setShowConnectors}>
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search" 
                  className="pl-9 h-9 bg-muted/50 border-border"
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
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{connector.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="api" className="p-6 pt-4 m-0">
                <p className="text-sm text-muted-foreground mb-4">
                  🔑 Connect Wiser AI programmatically to any third-party service using your own API keys.
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
                    >
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-xl">{connector.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{connector.name}</h4>
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
                    Connect Wiser AI to your custom Model Context Protocol servers
                  </p>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add MCP Server
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
