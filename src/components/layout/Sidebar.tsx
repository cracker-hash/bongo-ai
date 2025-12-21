import { 
  Plus, 
  MessageCircle, 
  GraduationCap, 
  HelpCircle, 
  Search, 
  Gamepad2, 
  Sparkles, 
  Code,
  Trash2,
  ChevronRight,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/contexts/ChatContext';
import { ChatMode, MODE_INFO } from '@/types/chat';
import { cn } from '@/lib/utils';
import bongoLogo from '@/assets/bongo-ai-logo.png';

const modeIcons: Record<ChatMode, React.ReactNode> = {
  conversation: <MessageCircle className="h-4 w-4" />,
  study: <GraduationCap className="h-4 w-4" />,
  quiz: <HelpCircle className="h-4 w-4" />,
  research: <Search className="h-4 w-4" />,
  game: <Gamepad2 className="h-4 w-4" />,
  creative: <Sparkles className="h-4 w-4" />,
  coding: <Code className="h-4 w-4" />,
};

export function Sidebar() {
  const { 
    sidebarOpen, 
    currentMode, 
    setCurrentMode, 
    projects, 
    currentProjectId,
    selectProject,
    deleteProject,
    createNewProject,
    clearMessages
  } = useChat();

  const modes = Object.keys(MODE_INFO) as ChatMode[];

  const handleNewChat = () => {
    createNewProject();
    clearMessages();
  };

  if (!sidebarOpen) return null;

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-72 glass-surface border-r border-border/50 z-40 animate-slide-in-left">
      <div className="flex flex-col h-full p-4">
        {/* New Chat Button */}
        <Button
          onClick={handleNewChat}
          className="w-full mb-6 gradient-bg hover:opacity-90 transition-opacity font-display font-semibold gap-2"
        >
          <Plus className="h-5 w-5" />
          New Chat
        </Button>

        {/* Model Selector */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground uppercase tracking-wide">
            <Zap className="h-3 w-3" />
            Model
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
            >
              Free
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-gold/30 text-gold hover:bg-gold/10"
            >
              Pro ✨
            </Button>
          </div>
        </div>

        {/* Modes */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground uppercase tracking-wide">
            <ChevronRight className="h-3 w-3" />
            Modes
          </div>
          <div className="grid grid-cols-2 gap-2">
            {modes.map((mode) => (
              <Button
                key={mode}
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMode(mode)}
                className={cn(
                  "justify-start gap-2 h-auto py-2 px-3 text-xs",
                  currentMode === mode 
                    ? "bg-primary/20 text-primary border border-primary/30" 
                    : "hover:bg-muted"
                )}
              >
                <span className={MODE_INFO[mode].color}>
                  {modeIcons[mode]}
                </span>
                <span className="truncate">{MODE_INFO[mode].label.replace(' Mode', '')}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 min-h-0">
          <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground uppercase tracking-wide">
            <MessageCircle className="h-3 w-3" />
            Recent Chats
          </div>
          <ScrollArea className="h-full pr-2">
            <div className="space-y-1">
              {projects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <img 
                    src={bongoLogo} 
                    alt="Bongo AI" 
                    className="h-16 w-16 mx-auto mb-3 opacity-30"
                  />
                  <p>No chats yet</p>
                  <p className="text-xs mt-1">Start a new conversation!</p>
                </div>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className={cn(
                      "group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                      currentProjectId === project.id 
                        ? "bg-primary/20 border border-primary/30" 
                        : "hover:bg-muted"
                    )}
                    onClick={() => selectProject(project.id)}
                  >
                    <span className={MODE_INFO[project.mode].color}>
                      {modeIcons[project.mode]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.messages.length} messages
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(project.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border/50 mt-4">
          <p className="text-xs text-muted-foreground text-center">
            Made with ❤️ in Tanzania
          </p>
        </div>
      </div>
    </aside>
  );
}
