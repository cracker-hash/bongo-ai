import { 
  Plus, 
  MessageCircle, 
  Lock,
  Loader2,
  Settings,
  LogOut,
  User,
  ChevronLeft,
  Search,
  FolderPlus,
  Pin,
  Archive,
  ChevronDown,
  Folder
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects, Project } from '@/hooks/useProjects';
import { ChatMode, MODE_INFO } from '@/types/chat';
import { cn } from '@/lib/utils';
import bongoLogo from '@/assets/bongo-ai-logo.png';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ChatMenu } from '@/components/chat/ChatMenu';
import { CreateProjectDialog } from '@/components/layout/CreateProjectDialog';
import { useState, useMemo } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  
  const { 
    sidebarOpen, 
    setSidebarOpen,
    chats, 
    currentChatId,
    selectChat,
    deleteChat,
    createNewChat,
    isLoadingChats,
    clearMessages,
    renameChat,
    pinChat,
    archiveChat,
    moveChatToProject
  } = useChat();
  const { isAuthenticated, setShowAuthModal, user, logout } = useAuth();
  const { projects, createProject } = useProjects();

  // Filter and organize chats
  const { pinnedChats, regularChats, archivedChats, projectChats } = useMemo(() => {
    const filtered = chats.filter(chat => 
      chat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pinned = filtered.filter(c => c.isPinned && !c.isArchived);
    const archived = filtered.filter(c => c.isArchived);
    const regular = filtered.filter(c => !c.isPinned && !c.isArchived && !c.projectId);
    
    const byProject: Record<string, typeof chats> = {};
    projects.forEach(p => { byProject[p.id] = []; });
    filtered.filter(c => c.projectId && !c.isArchived).forEach(c => {
      if (byProject[c.projectId!]) {
        byProject[c.projectId!].push(c);
      }
    });

    return {
      pinnedChats: pinned,
      regularChats: regular,
      archivedChats: archived,
      projectChats: byProject
    };
  }, [chats, searchQuery, projects]);

  const handleNewChat = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    createNewChat();
    clearMessages();
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const renderChatItem = (chat: typeof chats[0]) => (
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
      {chat.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
      <span className={cn("shrink-0", MODE_INFO[chat.mode].color)}>
        {modeIcons[chat.mode]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-sidebar-foreground truncate">{chat.name}</p>
        <p className="text-xs text-sidebar-foreground/50">
          {format(chat.updatedAt, 'MMM d, h:mm a')}
        </p>
      </div>
      <ChatMenu
        chatId={chat.id}
        chatName={chat.name}
        isPinned={chat.isPinned}
        isArchived={chat.isArchived}
        projectId={chat.projectId}
        projects={projects}
        onRename={renameChat}
        onPin={pinChat}
        onArchive={archiveChat}
        onMoveToProject={moveChatToProject}
        onDelete={deleteChat}
      />
    </div>
  );

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

        {/* Search */}
        {isAuthenticated && (
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-sidebar-accent/50 border-sidebar-border"
              />
            </div>
          </div>
        )}

        {/* Chat History */}
        <div className="flex-1 min-h-0 px-3">
          <ScrollArea className="h-full">
            <div className="space-y-4 pr-2 pb-4">
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
              ) : (
                <>
                  {/* Pinned Chats */}
                  {pinnedChats.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 text-xs text-sidebar-foreground/60 uppercase tracking-wide font-medium">
                        <Pin className="h-3 w-3" />
                        Pinned
                      </div>
                      <div className="space-y-1">
                        {pinnedChats.map(renderChatItem)}
                      </div>
                    </div>
                  )}

                  {/* Projects */}
                  {projects.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60 uppercase tracking-wide font-medium">
                          <Folder className="h-3 w-3" />
                          Projects
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setShowCreateProject(true)}
                        >
                          <FolderPlus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {projects.map((project) => (
                          <Collapsible
                            key={project.id}
                            open={expandedProjects.has(project.id)}
                            onOpenChange={() => toggleProject(project.id)}
                          >
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                className="w-full justify-between h-9 px-2 hover:bg-sidebar-accent/50"
                              >
                                <div className="flex items-center gap-2">
                                  <Folder className="h-4 w-4 text-primary" />
                                  <span className="text-sm truncate">{project.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({projectChats[project.id]?.length || 0})
                                  </span>
                                </div>
                                <ChevronDown className={cn(
                                  "h-4 w-4 transition-transform",
                                  expandedProjects.has(project.id) && "rotate-180"
                                )} />
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="pl-4 space-y-1 mt-1">
                                {projectChats[project.id]?.map(renderChatItem)}
                                {projectChats[project.id]?.length === 0 && (
                                  <p className="text-xs text-muted-foreground py-2 px-2">
                                    No chats in this project
                                  </p>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regular Chats */}
                  {regularChats.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 text-xs text-sidebar-foreground/60 uppercase tracking-wide font-medium">
                        <MessageCircle className="h-3 w-3" />
                        Recent Chats
                      </div>
                      <div className="space-y-1">
                        {regularChats.map(renderChatItem)}
                      </div>
                    </div>
                  )}

                  {/* Create Project Button if no projects */}
                  {projects.length === 0 && isAuthenticated && (
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-dashed"
                      onClick={() => setShowCreateProject(true)}
                    >
                      <FolderPlus className="h-4 w-4" />
                      Create Project
                    </Button>
                  )}

                  {/* Archived */}
                  {archivedChats.length > 0 && (
                    <Collapsible open={showArchived} onOpenChange={setShowArchived}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between h-8 px-2"
                        >
                          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60 uppercase tracking-wide font-medium">
                            <Archive className="h-3 w-3" />
                            Archived ({archivedChats.length})
                          </div>
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            showArchived && "rotate-180"
                          )} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-1 mt-1">
                          {archivedChats.map(renderChatItem)}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Empty state */}
                  {pinnedChats.length === 0 && regularChats.length === 0 && archivedChats.length === 0 && projects.every(p => projectChats[p.id]?.length === 0) && (
                    <div className="text-center py-8 text-sidebar-foreground/60 text-sm">
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No chats yet</p>
                      <p className="text-xs mt-1 opacity-70">Start a new conversation!</p>
                    </div>
                  )}
                </>
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
                onClick={() => navigate('/settings')}
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

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onCreate={async (name, icon, description) => {
          await createProject(name, icon, description);
        }}
      />
    </>
  );
}
