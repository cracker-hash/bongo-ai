import { 
  Plus, 
  MessageCircle, 
  Trash2,
  Lock,
  X,
  Loader2,
  Settings,
  LogOut,
  User,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMode, MODE_INFO } from '@/types/chat';
import { cn } from '@/lib/utils';
import bongoLogo from '@/assets/bongo-ai-logo.png';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

const modeIcons: Record<ChatMode, React.ReactNode> = {
  conversation: <MessageCircle className="h-4 w-4" />,
  study: <MessageCircle className="h-4 w-4" />,
  quiz: <MessageCircle className="h-4 w-4" />,
  research: <MessageCircle className="h-4 w-4" />,
  game: <MessageCircle className="h-4 w-4" />,
  creative: <MessageCircle className="h-4 w-4" />,
  coding: <MessageCircle className="h-4 w-4" />,
};

export function Sidebar() {
  const { 
    sidebarOpen, 
    setSidebarOpen,
    chats, 
    currentChatId,
    selectChat,
    deleteChat,
    createNewChat,
    isLoadingChats,
    clearMessages
  } = useChat();
  const { isAuthenticated, setShowAuthModal, user, logout } = useAuth();

  const handleNewChat = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    createNewChat();
    clearMessages();
  };

  if (!sidebarOpen) return null;

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
        onClick={() => setSidebarOpen(false)}
      />
      
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border z-40 flex flex-col animate-slide-in-left">
        {/* Header with logo */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <img 
              src={bongoLogo} 
              alt="Bongo AI" 
              className="h-8 w-8 rounded-lg object-contain"
            />
            <span className="font-semibold text-lg text-sidebar-foreground">
              Bongo AI
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setSidebarOpen(false)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <Button
            onClick={handleNewChat}
            className="w-full gradient-bg hover:opacity-90 transition-opacity font-medium gap-2 h-11"
          >
            <Plus className="h-5 w-5" />
            New Chat
            {!isAuthenticated && <Lock className="h-3 w-3 ml-auto opacity-70" />}
          </Button>
        </div>

        {/* Chat History */}
        <div className="flex-1 min-h-0 px-3">
          <div className="flex items-center gap-2 mb-2 text-xs text-sidebar-foreground/60 uppercase tracking-wide font-medium">
            <MessageCircle className="h-3 w-3" />
            Chat History
            {!isAuthenticated && <Lock className="h-3 w-3 ml-auto" />}
          </div>
          <ScrollArea className="h-[calc(100%-32px)]">
            <div className="space-y-1 pr-2">
              {!isAuthenticated ? (
                <div className="text-center py-8 text-sidebar-foreground/60 text-sm">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Sign in to save chats</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-primary mt-2"
                    onClick={() => setShowAuthModal(true)}
                  >
                    Sign in now
                  </Button>
                </div>
              ) : isLoadingChats ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-sidebar-foreground/60" />
                </div>
              ) : chats.length === 0 ? (
                <div className="text-center py-8 text-sidebar-foreground/60 text-sm">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No chats yet</p>
                  <p className="text-xs mt-1 opacity-70">Start a new conversation!</p>
                </div>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      "group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all",
                      currentChatId === chat.id 
                        ? "bg-sidebar-accent" 
                        : "hover:bg-sidebar-accent/50"
                    )}
                    onClick={() => selectChat(chat.id)}
                  >
                    <span className={cn("shrink-0", MODE_INFO[chat.mode].color)}>
                      {modeIcons[chat.mode]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-sidebar-foreground truncate">{chat.name}</p>
                      <p className="text-xs text-sidebar-foreground/50">
                        {format(chat.updatedAt, 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(chat.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* User Profile Section at Bottom */}
        <div className="mt-auto border-t border-sidebar-border">
          <div className="p-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent/50 cursor-pointer transition-colors">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-sidebar-accent flex items-center justify-center overflow-hidden border-2 border-primary/30">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-sidebar-foreground" />
                    )}
                  </div>
                  {/* Online status indicator */}
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[hsl(var(--online))] border-2 border-sidebar" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user.name || 'User'}
                  </p>
                  <p className="text-xs text-sidebar-foreground/50 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-3 text-sidebar-foreground hover:bg-sidebar-accent/50"
                onClick={() => setShowAuthModal(true)}
              >
                <div className="h-10 w-10 rounded-full bg-sidebar-accent flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <span className="font-medium">Sign In</span>
              </Button>
            )}
          </div>

          {/* Settings and Logout */}
          {isAuthenticated && (
            <div className="px-3 pb-3 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 gap-2 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}