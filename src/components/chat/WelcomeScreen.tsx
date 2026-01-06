import { useState } from 'react';
import { 
  Presentation, 
  Globe, 
  Smartphone, 
  Palette, 
  MoreHorizontal,
  Settings2,
  X,
  Search,
  Mail,
  Calendar,
  Github,
  Slack,
  FileText,
  FolderOpen,
  Plus,
  ExternalLink,
  CalendarDays,
  AreaChart,
  Table2,
  BarChart3,
  Video,
  AudioLines,
  MessageSquare,
  BookOpen,
  Link,
  Figma,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMode } from '@/types/chat';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';

// Tool types
type ToolType = 'slides' | 'website' | 'apps' | 'design' | 'default';

// Tool buttons config
const toolButtons = [
  { id: 'slides' as ToolType, icon: Presentation, label: 'Create slides', color: 'text-blue-400' },
  { id: 'website' as ToolType, icon: Globe, label: 'Build website', color: 'text-cyan-400' },
  { id: 'apps' as ToolType, icon: Smartphone, label: 'Develop apps', color: 'text-green-400' },
  { id: 'design' as ToolType, icon: Palette, label: 'Design', color: 'text-purple-400' },
];

// More dropdown items
const moreTools = [
  { icon: CalendarDays, label: 'Schedule task' },
  { icon: Search, label: 'Wide Research' },
  { icon: Table2, label: 'Spreadsheet' },
  { icon: BarChart3, label: 'Visualization' },
  { icon: Video, label: 'Video' },
  { icon: AudioLines, label: 'Audio' },
  { icon: MessageSquare, label: 'Chat mode' },
  { icon: BookOpen, label: 'Playbook', external: true },
];

// Connector icons for the row
const connectorIcons = ['🌐', '📧', '📅', '📁', '🐙', '📝'];

// Content for each tool selection
const toolContent: Record<ToolType, {
  placeholder: string;
  prompts?: { text: string }[];
  templates?: { title: string; description: string; image?: string }[];
  categories?: { icon: any; label: string }[];
  integrations?: { label: string }[];
}> = {
  slides: {
    placeholder: 'Describe your presentation topic',
    prompts: [
      { text: 'Create a sales presentation for a B2B software solution' },
      { text: 'Prepare a training module on cybersecurity best practices' },
      { text: 'Design a pitch deck for a startup seeking funding' },
      { text: 'Create a presentation on the impact of AI on the future of work' },
    ],
    templates: [
      { title: 'Business Pitch', description: 'Professional pitch deck template' },
      { title: 'Tech Overview', description: 'Modern tech presentation' },
      { title: 'Training Module', description: 'Educational training slides' },
      { title: 'Annual Report', description: 'Corporate annual review' },
    ],
  },
  website: {
    placeholder: 'Describe the website you want to build',
    categories: [
      { icon: Layers, label: 'Landing page' },
      { icon: AreaChart, label: 'Dashboard' },
      { icon: FolderOpen, label: 'Portfolio' },
      { icon: Globe, label: 'Corporate' },
      { icon: Layers, label: 'SaaS' },
      { icon: Link, label: 'Link-in-bio' },
    ],
    integrations: [
      { label: 'LLM' }, 
      { label: 'Stripe integration' }, 
      { label: 'Database' }, 
      { label: 'Image generation' }, 
      { label: 'Maps' },
      { label: 'Notification' }, 
      { label: 'File storage' }, 
      { label: 'Data API' }, 
      { label: 'Voice-to-Text' }
    ],
  },
  apps: {
    placeholder: 'Describe the mobile app you want to build',
    prompts: [
      { text: 'Make a weather app showing current conditions and forecasts' },
      { text: 'Make a habit-building tool with daily tracking' },
      { text: 'Develop a reading tracker for progress and notes' },
      { text: 'Develop a fitness tracking app with daily check-ins and progress tracking' },
      { text: 'Build a study planning tool to set goals and track progress' },
    ],
  },
  design: {
    placeholder: 'Describe the image you want to create',
    templates: [
      { title: 'Try Nano Banana', description: 'Generate diverse image styles instantly with Nano Banana.' },
      { title: 'Tech expo booth', description: 'Design a 36-square-meter tech expo booth for my AI company...' },
      { title: 'Meditation app UI/UX', description: 'Design a calm and simple UI/UX for my meditation and mindfulness app...' },
      { title: 'SaaS landing page', description: 'Design a high-conversion marketing landing page for my project...' },
    ],
  },
  default: {
    placeholder: 'Assign a task or ask anything',
  },
};

// App connectors for modal
const appConnectors = [
  { name: 'My Browser', description: 'Access web on your own browser', icon: '🌐', isNew: true },
  { name: 'Gmail', description: 'Draft replies and summarize emails', icon: Mail },
  { name: 'Google Calendar', description: 'Manage events and optimize time', icon: Calendar },
  { name: 'Google Drive', description: 'Access and manage documents', icon: FolderOpen },
  { name: 'GitHub', description: 'Manage repos and track changes', icon: Github },
  { name: 'Slack', description: 'Track conversations and messages', icon: Slack },
  { name: 'Notion', description: 'Search and update notes', icon: FileText },
];

// API connectors for modal
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
  const [selectedTool, setSelectedTool] = useState<ToolType>('default');
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [adSlideIndex, setAdSlideIndex] = useState(0);

  const handleToolClick = (toolId: ToolType) => {
    setSelectedTool(selectedTool === toolId ? 'default' : toolId);
  };

  const handlePromptClick = (prompt: string) => {
    onPromptClick(prompt, 'creative');
  };

  const filteredApps = appConnectors.filter(c => 
    c.name.toLowerCase().includes(connectorSearch.toLowerCase())
  );
  const filteredAPIs = apiConnectors.filter(c => 
    c.name.toLowerCase().includes(connectorSearch.toLowerCase())
  );

  const currentContent = toolContent[selectedTool];
  
  // Ads/promo slides
  const adSlides = [
    {
      title: 'Build your full-stack web app',
      description: 'Build your first AI-native web apps and claim 1 trillion LLM tokens',
    },
    {
      title: 'Create stunning presentations',
      description: 'Design pro-level slides with AI-powered layouts and imagery',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-start min-h-full py-8 px-4 animate-fade-in">
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

      {/* Content Container */}
      <div className="w-full max-w-3xl space-y-4">
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
            {connectorIcons.map((emoji, i) => (
              <span key={i} className="text-sm">{emoji}</span>
            ))}
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <X className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Tool buttons row */}
        <div className="flex flex-wrap items-center justify-center gap-2 py-4">
          {toolButtons.map((tool) => (
            <Button
              key={tool.id}
              variant="outline"
              className={cn(
                "h-10 px-4 gap-2 rounded-full bg-card border-border hover:bg-muted transition-all",
                selectedTool === tool.id && "border-primary bg-primary/10"
              )}
              onClick={() => handleToolClick(tool.id)}
            >
              <tool.icon className={cn("h-4 w-4", selectedTool === tool.id ? "text-primary" : tool.color)} />
              <span className={cn("text-sm", selectedTool === tool.id && "text-primary")}>{tool.label}</span>
            </Button>
          ))}
          
          {/* More button with popover */}
          <Popover open={showMoreTools} onOpenChange={setShowMoreTools}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-10 px-4 gap-2 rounded-full bg-card border-border hover:bg-muted transition-all"
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">More</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              align="end" 
              side="top"
              className="w-56 p-2 bg-card border-border"
            >
              {moreTools.map((tool, index) => (
                <button
                  key={index}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                  onClick={() => setShowMoreTools(false)}
                >
                  <tool.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{tool.label}</span>
                  {tool.external && <ArrowUpRight className="h-3 w-3 ml-auto text-muted-foreground" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* Dynamic content based on selected tool */}
        {selectedTool !== 'default' && (
          <div className="space-y-4 animate-fade-in">
            {/* Website categories */}
            {selectedTool === 'website' && currentContent.categories && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">What would you like to build?</span>
                  <div className="flex items-center gap-2 text-sm">
                    <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                      <Link className="h-3 w-3" />
                      Add website reference
                    </button>
                    <span className="text-muted-foreground">|</span>
                    <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                      <Figma className="h-3 w-3 text-pink-500" />
                      Import from Figma
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentContent.categories.map((cat, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-10 px-4 gap-2 rounded-full bg-card border-border hover:bg-muted"
                      onClick={() => handlePromptClick(`Create a ${cat.label.toLowerCase()}`)}
                    >
                      <cat.icon className="h-4 w-4" />
                      {cat.label}
                    </Button>
                  ))}
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Prompts list for slides/apps */}
            {currentContent.prompts && (
              <div className="space-y-3">
                <span className="text-sm font-medium text-foreground">Sample prompts</span>
                <div className={cn(
                  selectedTool === 'slides' ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "space-y-0"
                )}>
                  {currentContent.prompts.map((prompt, index) => (
                    <button
                      key={index}
                      className={cn(
                        "text-left transition-colors",
                        selectedTool === 'slides' 
                          ? "p-4 rounded-xl bg-card border border-border hover:bg-muted"
                          : "w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-muted/50"
                      )}
                      onClick={() => handlePromptClick(prompt.text)}
                    >
                      <span className="text-sm text-muted-foreground">{prompt.text}</span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Templates grid for slides */}
            {selectedTool === 'slides' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Choose a template</span>
                  <Button variant="ghost" className="h-8 gap-2 text-sm">
                    <Layers className="h-4 w-4" />
                    8 - 12
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Design templates */}
            {selectedTool === 'design' && currentContent.templates && (
              <div className="space-y-3">
                <span className="text-sm font-medium text-foreground">Get started with</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentContent.templates.map((template, index) => (
                    <button
                      key={index}
                      className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted transition-colors text-left"
                      onClick={() => handlePromptClick(template.description)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {index === 0 && <span className="text-lg">🍌</span>}
                          <span className="font-medium text-sm">{template.title}</span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                      </div>
                      <div className="w-20 h-14 rounded-lg bg-gradient-to-br from-muted to-muted/50 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Website integrations */}
            {selectedTool === 'website' && currentContent.integrations && (
              <div className="bg-card rounded-xl p-5 border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-medium text-sm">Powerful built-in Integrations</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex flex-wrap gap-2">
                    {currentContent.integrations.map((int, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground border border-border"
                      >
                        {int.label}
                      </span>
                    ))}
                  </div>
                  <div className="w-32 h-24 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ml-4">
                    <span className="text-xs text-muted-foreground">AI website builder</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Default ads slider when no tool selected */}
        {selectedTool === 'default' && (
          <div className="mt-6 space-y-3">
            <div className="bg-card rounded-xl p-4 border border-border flex items-center gap-4">
              <div className="flex-1">
                <h3 className="font-medium text-foreground mb-1">{adSlides[adSlideIndex].title}</h3>
                <p className="text-sm text-muted-foreground">
                  {adSlides[adSlideIndex].description}
                </p>
              </div>
              <div className="w-28 h-16 rounded-lg bg-gradient-to-br from-primary via-primary/80 to-primary/50 flex items-center justify-center shrink-0">
                <span className="text-xs text-primary-foreground font-medium text-center px-2">AI website builder</span>
              </div>
            </div>

            {/* Carousel dots */}
            <div className="flex justify-center gap-2">
              {adSlides.map((_, index) => (
                <button
                  key={index}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    index === adSlideIndex ? "bg-muted-foreground/50" : "bg-muted-foreground/20"
                  )}
                  onClick={() => setAdSlideIndex(index)}
                />
              ))}
            </div>
          </div>
        )}
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
