import { 
  Plus, 
  MessageCircle, 
  Trash2,
  Lock,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMode, MODE_INFO } from '@/types/chat';
import { cn } from '@/lib/utils';
import bongoLogo from '@/assets/bongo-ai-logo.png';
import { format } from 'date-fns';

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
  const { isAuthenticated, setShowAuthModal } = useAuth();

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
      
      <aside className="fixed left-0 top-16 bottom-0 w-72 glass-surface border-r border-border/50 z-40 animate-slide-in-left">
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 lg:hidden hover:bg-muted"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="flex flex-col h-full p-4 pt-12 lg:pt-4">
          {/* New Chat Button */}
          <Button
            onClick={handleNewChat}
            className="w-full mb-6 gradient-bg hover:opacity-90 transition-opacity font-display font-semibold gap-2"
          >
            <Plus className="h-5 w-5" />
            New Chat
            {!isAuthenticated && <Lock className="h-3 w-3 ml-auto opacity-70" />}
          </Button>

          {/* Chat History */}
          <div className="flex-1 min-h-0">
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground uppercase tracking-wide">
              <MessageCircle className="h-3 w-3" />
              Recent Chats
              {!isAuthenticated && <Lock className="h-3 w-3 ml-auto" />}
            </div>
            <ScrollArea className="h-full pr-2">
              <div className="space-y-1">
                {!isAuthenticated ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <img 
                      src={bongoLogo} 
                      alt="Bongo AI" 
                      className="h-16 w-16 mx-auto mb-3 opacity-30"
                    />
                    <p>Chat history requires login</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-primary mt-2"
                      onClick={() => setShowAuthModal(true)}
                    >
                      Sign in to save chats
                    </Button>
                  </div>
                ) : isLoadingChats ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : chats.length === 0 ? (
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
                  chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={cn(
                        "group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                        currentChatId === chat.id 
                          ? "bg-primary/20 border border-primary/30" 
                          : "hover:bg-muted"
                      )}
                      onClick={() => selectChat(chat.id)}
                    >
                      <span className={MODE_INFO[chat.mode].color}>
                        {modeIcons[chat.mode]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{chat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(chat.updatedAt, 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
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
    </>
  );
}
