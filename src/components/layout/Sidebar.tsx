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
  ChevronRight,
  Folder,
  Image as ImageIcon,
  Library
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatContext } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects, Project } from '@/hooks/useProjects';
import { ChatMode, MODE_INFO } from '@/types/chat';
import { cn } from '@/lib/utils';
import wiserLogo from '@/assets/wiser-ai-logo.png';
import { format } from 'date-fns';
import { ChatMenu } from '@/components/chat/ChatMenu';
import { ProjectMenu } from '@/components/layout/ProjectMenu';
import { CreateProjectDialog } from '@/components/layout/CreateProjectDialog';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { XpStats } from '@/components/gamification/XpStats';
import { useState, useMemo, useContext as useReactContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from '@/hooks/use-toast';

const modeIcons: Record<ChatMode, React.ReactNode> = {
  conversation: <MessageCircle className="h-4 w-4" />,
  study: <MessageCircle className="h-4 w-4" />,
  quiz: <MessageCircle className="h-4 w-4" />,
  research: <MessageCircle className="h-4 w-4" />,
  game: <MessageCircle className="h-4 w-4" />,
  creative: <MessageCircle className="h-4 w-4" />,
  coding: <MessageCircle className="h-4 w-4" />,
};

// Safe hook to use chat context - returns defaults if not in provider
function useChatSafe() {
  const context = useReactContext(ChatContext);
  if (!context) {
    return {
      sidebarOpen: false,
      setSidebarOpen: () => {},
      chats: [],
      currentChatId: null,
      selectChat: () => {},
      deleteChat: async () => {},
      createNewChat: () => {},
      createChatForProject: async () => {},
      isLoadingChats: false,
      clearMessages: () => {},
      renameChat: async () => {},
      pinChat: async () => {},
      archiveChat: async () => {},
      moveChatToProject: async () => {},
      messages: []
    };
  }
  return context;
}

export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagesExpanded, setImagesExpanded] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [chatsExpanded, setChatsExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  const { 
    sidebarOpen, 
    setSidebarOpen,
    chats, 
    currentChatId,
    selectChat,
    deleteChat,
    createNewChat,
    createChatForProject,
    isLoadingChats,
    clearMessages,
    renameChat,
    pinChat,
    archiveChat,
    moveChatToProject,
    messages
  } = useChatSafe();
  const { isAuthenticated, setShowAuthModal, user, logout } = useAuth();
  const { projects, createProject, updateProject, deleteProject } = useProjects();
  const navigate = useNavigate();

  // Rename project handler
  const handleRenameProject = async (id: string, name: string) => {
    await updateProject(id, { name });
  };

  // Delete project handler (with all chats)
  const handleDeleteProject = async (id: string) => {
    await deleteProject(id, true); // true = delete all chats in project
  };

  // Handle creating project and auto-open chat
  const handleCreateProject = async (name: string, icon: string, description?: string) => {
    const projectId = await createProject(name, icon, description);
    if (projectId) {
      // Auto-create and open a chat for this project
      await createChatForProject(projectId, name);
      // Expand the project in the sidebar
      setExpandedProjects(prev => new Set([...prev, projectId]));
    }
  };

  // Collect all images from messages
  const allImages = useMemo(() => {
    const images: { url: string; type: 'uploaded' | 'generated' }[] = [];
    messages.forEach(msg => {
      msg.images?.forEach(img => {
        images.push({ url: img.url, type: img.type });
      });
    });
    return images;
  }, [messages]);

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
        "group/chat flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all duration-200",
        currentChatId === chat.id 
          ? "bg-sidebar-accent shadow-chat-item" 
          : "hover:bg-sidebar-accent/60 hover:shadow-chat-hover"
      )}
      onClick={() => selectChat(chat.id)}
    >
      {chat.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
      <span className={cn("shrink-0", MODE_INFO[chat.mode].color)}>
        {modeIcons[chat.mode]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-sidebar-foreground truncate">{chat.name}</p>
      </div>
      <div className={cn(
        "transition-opacity duration-200",
        currentChatId === chat.id ? "opacity-100" : "opacity-0 group-hover/chat:opacity-100"
      )}>
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
    </div>
  );

  if (!sidebarOpen) return null;

  // Show settings panel instead of main sidebar
  if (showSettings) {
    return (
      <>
        {/* Mobile overlay */}
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
        <aside className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar z-40 flex flex-col animate-slide-in-left border-r border-sidebar-border/50">
          <SettingsPanel onBack={() => setShowSettings(false)} />
        </aside>
      </>
    );
  }

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
        onClick={() => setSidebarOpen(false)}
      />
      
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar z-40 flex flex-col animate-slide-in-left border-r border-sidebar-border/50">
        {/* Header with logo and close */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border/50">
          <div className="flex items-center gap-2.5">
            <img 
              src={wiserLogo} 
              alt="Wiser AI" 
              className="h-8 w-8 rounded-lg object-contain"
            />
            <span className="font-semibold text-lg text-sidebar-foreground">
              Wiser AI
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setSidebarOpen(false)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* 1. NEW CHAT - Top Section */}
        <div className="p-3 pb-2">
          <Button
            onClick={handleNewChat}
            className="w-full bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground border border-sidebar-border/50 transition-all duration-200 font-medium gap-2.5 h-11 rounded-lg hover:shadow-chat-hover"
          >
            <Plus className="h-5 w-5" />
            New Chat
            {!isAuthenticated && <Lock className="h-3.5 w-3.5 ml-auto opacity-60" />}
          </Button>
        </div>

        {/* 2. SEARCH CHAT */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-sidebar-accent/40 border-sidebar-border/50 rounded-lg placeholder:text-muted-foreground/60 focus:bg-sidebar-accent/60 transition-colors"
            />
          </div>
        </div>

        {/* XP Stats - Show for authenticated users */}
        {isAuthenticated && (
          <div className="px-3 pb-3">
            <XpStats />
          </div>
        )}

        {/* Scrollable Content Area */}
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1 pb-4">
            
            {/* 3. IMAGES SECTION */}
            <Collapsible open={imagesExpanded} onOpenChange={setImagesExpanded}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-sidebar-accent/40 transition-colors group/section">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wide">
                      Images
                    </span>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    imagesExpanded && "rotate-180"
                  )} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                {allImages.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1.5 p-1">
                    {allImages.slice(0, 9).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(img.url)}
                        className="aspect-square rounded-md overflow-hidden bg-sidebar-accent/50 hover:ring-2 hover:ring-primary/50 transition-all duration-200"
                      >
                        <img 
                          src={img.url} 
                          alt="Chat image" 
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                    {allImages.length > 9 && (
                      <div className="aspect-square rounded-md bg-sidebar-accent/50 flex items-center justify-center text-xs text-muted-foreground">
                        +{allImages.length - 9}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4 px-2 text-center">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground/60">
                      Generated images will appear here
                    </p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* 4. PROJECTS SECTION */}
            <Collapsible open={projectsExpanded} onOpenChange={setProjectsExpanded}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-sidebar-accent/40 transition-colors group/section">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wide">
                      Projects
                    </span>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    projectsExpanded && "rotate-180"
                  )} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1">
                {/* New Project Button - Always visible */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-9 px-2 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                  onClick={() => setShowCreateProject(true)}
                >
                  <FolderPlus className="h-4 w-4" />
                  <span className="text-sm">New Project</span>
                </Button>

                {/* Project List */}
                {projects.map((project) => (
                  <Collapsible
                    key={project.id}
                    open={expandedProjects.has(project.id)}
                    onOpenChange={() => toggleProject(project.id)}
                  >
                    <div className="flex items-center group/project">
                      <CollapsibleTrigger asChild>
                        <button className="flex-1 flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-sidebar-accent/60 transition-all duration-200 hover:shadow-chat-hover">
                          <ChevronRight className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform duration-200",
                            expandedProjects.has(project.id) && "rotate-90"
                          )} />
                          <Folder className="h-4 w-4 text-primary" />
                          <span className="text-sm text-sidebar-foreground truncate flex-1 text-left">
                            {project.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {projectChats[project.id]?.length || 0}
                          </span>
                        </button>
                      </CollapsibleTrigger>
                      <ProjectMenu
                        projectId={project.id}
                        projectName={project.name}
                        onRename={handleRenameProject}
                        onDelete={handleDeleteProject}
                      />
                    </div>
                    <CollapsibleContent>
                      <div className="pl-6 space-y-0.5 mt-1">
                        {projectChats[project.id]?.map(renderChatItem)}
                        {projectChats[project.id]?.length === 0 && (
                          <p className="text-xs text-muted-foreground/60 py-2 px-2">
                            No chats in this project
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* 5. YOUR CHATS SECTION */}
            <Collapsible open={chatsExpanded} onOpenChange={setChatsExpanded}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-sidebar-accent/40 transition-colors group/section">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wide">
                      Your Chats
                    </span>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    chatsExpanded && "rotate-180"
                  )} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-0.5">
                {!isAuthenticated ? (
                  <div className="text-center py-6">
                    <MessageCircle className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground/60">Sign in to save chats</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-primary mt-1"
                      onClick={() => setShowAuthModal(true)}
                    >
                      Sign in now
                    </Button>
                  </div>
                ) : isLoadingChats ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Pinned Chats */}
                    {pinnedChats.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground/60">
                          <Pin className="h-3 w-3" />
                          <span>Pinned</span>
                        </div>
                        {pinnedChats.map(renderChatItem)}
                      </div>
                    )}

                    {/* Regular Chats */}
                    {regularChats.map(renderChatItem)}

                    {/* Archived Section */}
                    {archivedChats.length > 0 && (
                      <Collapsible open={showArchived} onOpenChange={setShowArchived} className="mt-2">
                        <CollapsibleTrigger asChild>
                          <button className="w-full flex items-center gap-2 py-1.5 px-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                            <Archive className="h-3 w-3" />
                            <span>Archived ({archivedChats.length})</span>
                            <ChevronDown className={cn(
                              "h-3 w-3 ml-auto transition-transform",
                              showArchived && "rotate-180"
                            )} />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-1 space-y-0.5">
                          {archivedChats.map(renderChatItem)}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Empty state */}
                    {pinnedChats.length === 0 && regularChats.length === 0 && (
                      <div className="text-center py-6">
                        <MessageCircle className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground/60">No chats yet</p>
                        <p className="text-xs text-muted-foreground/40 mt-1">Start a new conversation!</p>
                      </div>
                    )}
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        {/* User Profile Section at Bottom */}
        <div className="mt-auto border-t border-sidebar-border/50">
          <div className="p-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent/50 cursor-pointer transition-all duration-200 hover:shadow-chat-hover">
                <div className="relative">
                  <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center overflow-hidden border-2 border-primary/20">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-sidebar-foreground" />
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[hsl(var(--online))] border-2 border-sidebar" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user.name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-2.5 text-sidebar-foreground hover:bg-sidebar-accent/50"
                onClick={() => setShowAuthModal(true)}
              >
                <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <span className="font-medium">Sign In</span>
              </Button>
            )}
          </div>

          {/* Library and Settings */}
          {isAuthenticated && (
            <div className="px-3 pb-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-9 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                onClick={() => navigate('/library')}
              >
                <Library className="h-4 w-4" />
                Library
              </Button>
            </div>
          )}

          {/* Settings and Logout */}
          {isAuthenticated && (
            <div className="px-3 pb-3 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 gap-2 h-9 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 gap-2 h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will need to sign in again to access your account and chat history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => {
                        logout();
                        toast({ description: 'Logged out successfully' });
                      }} 
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Log Out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </aside>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt="Full size" 
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onCreate={handleCreateProject}
      />
    </>
  );
}
