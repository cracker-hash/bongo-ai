import { useState } from 'react';
import { 
  MoreVertical, 
  Share2, 
  Users, 
  Pencil, 
  FolderInput, 
  Pin, 
  Archive, 
  Trash2,
  Copy,
  Link,
  FileText,
  MessageCircle,
  Send,
  Mail,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import wiserLogo from '@/assets/wiser-ai-logo.png';

interface Project {
  id: string;
  name: string;
  icon: string;
}

interface ChatMenuProps {
  chatId: string;
  chatName: string;
  isPinned: boolean;
  isArchived: boolean;
  projectId: string | null;
  projects: Project[];
  onRename: (id: string, name: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onArchive: (id: string, archived: boolean) => void;
  onMoveToProject: (id: string, projectId: string | null) => void;
  onDelete: (id: string) => void;
  onShare?: (id: string) => void;
}

// Social share icons as simple SVG components
const WhatsAppIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const XIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.757-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
  </svg>
);

export function ChatMenu({
  chatId,
  chatName,
  isPinned,
  isArchived,
  projectId,
  projects,
  onRename,
  onPin,
  onArchive,
  onMoveToProject,
  onDelete,
}: ChatMenuProps) {
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [newName, setNewName] = useState(chatName);

  const shareUrl = `${window.location.origin}/chat/${chatId}`;
  const shareText = `Check out my conversation with WISER AI: "${chatName}"`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard');
  };

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);
    
    const shareLinks: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      email: `mailto:?subject=${encodeURIComponent(`WISER AI Chat: ${chatName}`)}&body=${encodedText}%20${encodedUrl}`,
    };

    if (shareLinks[platform]) {
      window.open(shareLinks[platform], '_blank', 'noopener,noreferrer');
    }
    setShowShareDialog(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `WISER AI: ${chatName}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    }
    setShowShareDialog(false);
  };

  const handleCopyContent = () => {
    toast.success('Chat content copied to clipboard');
  };

  const handleExport = () => {
    toast.success('Chat exported as text');
  };

  const handleRename = () => {
    if (newName.trim() && newName !== chatName) {
      onRename(chatId, newName.trim());
    }
    setShowRenameDialog(false);
  };

  const handleStartGroupChat = () => {
    toast.info('Group chat feature coming soon');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 hover:bg-sidebar-accent/80 text-muted-foreground hover:text-foreground transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-[#1e1e1e] border-[#333] rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-200"
        >
          {/* Share */}
          <DropdownMenuItem 
            onClick={() => setShowShareDialog(true)}
            className="gap-3 py-2.5 hover:bg-white/10 cursor-pointer"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </DropdownMenuItem>

          {/* Start Group Chat */}
          <DropdownMenuItem 
            onClick={handleStartGroupChat}
            className="gap-3 py-2.5 hover:bg-white/10 cursor-pointer"
          >
            <Users className="h-4 w-4" />
            <span>Start a group chat</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-[#333]" />

          {/* Rename */}
          <DropdownMenuItem 
            onClick={() => {
              setNewName(chatName);
              setShowRenameDialog(true);
            }}
            className="gap-3 py-2.5 hover:bg-white/10 cursor-pointer"
          >
            <Pencil className="h-4 w-4" />
            <span>Rename</span>
          </DropdownMenuItem>

          {/* Move to Project */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-3 py-2.5 hover:bg-white/10">
              <FolderInput className="h-4 w-4" />
              <span>Move to project</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-[#1e1e1e] border-[#333] rounded-xl">
              <DropdownMenuItem 
                onClick={() => onMoveToProject(chatId, null)}
                className={cn("py-2", !projectId && "bg-white/10")}
              >
                No Project
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#333]" />
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => onMoveToProject(chatId, project.id)}
                  className={cn("py-2", projectId === project.id && "bg-white/10")}
                >
                  {project.name}
                </DropdownMenuItem>
              ))}
              {projects.length === 0 && (
                <DropdownMenuItem disabled className="text-muted-foreground">
                  No projects yet
                </DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator className="bg-[#333]" />

          {/* Pin */}
          <DropdownMenuItem 
            onClick={() => onPin(chatId, !isPinned)}
            className="gap-3 py-2.5 hover:bg-white/10 cursor-pointer"
          >
            <Pin className={cn("h-4 w-4", isPinned && "fill-amber-500 text-amber-500")} />
            <span>{isPinned ? 'Unpin chat' : 'Pin chat'}</span>
          </DropdownMenuItem>

          {/* Archive */}
          <DropdownMenuItem 
            onClick={() => onArchive(chatId, !isArchived)}
            className="gap-3 py-2.5 hover:bg-white/10 cursor-pointer"
          >
            <Archive className="h-4 w-4" />
            <span>{isArchived ? 'Unarchive' : 'Archive'}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-[#333]" />

          {/* Delete */}
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="gap-3 py-2.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer focus:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="bg-[#1e1e1e] border-[#333] max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <img src={wiserLogo} alt="WISER AI" className="h-8 w-8 rounded-lg" />
              <span>Share Chat</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Share "{chatName}" with others
            </DialogDescription>
          </DialogHeader>
          
          {/* Share preview card */}
          <div className="bg-[#2a2a2a] rounded-xl p-4 border border-[#333]">
            <div className="flex items-center gap-3 mb-2">
              <img src={wiserLogo} alt="" className="h-10 w-10 rounded-lg" />
              <div>
                <p className="font-medium text-sm">WISER AI</p>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{chatName}</p>
              </div>
            </div>
          </div>

          {/* Share buttons grid */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <button
              onClick={() => handleShare('whatsapp')}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white">
                <WhatsAppIcon />
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground">WhatsApp</span>
            </button>
            
            <button
              onClick={() => handleShare('telegram')}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#0088cc] flex items-center justify-center text-white">
                <TelegramIcon />
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground">Telegram</span>
            </button>
            
            <button
              onClick={() => handleShare('twitter')}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white border border-[#333]">
                <XIcon />
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground">X</span>
            </button>
            
            <button
              onClick={() => handleShare('facebook')}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
                <FacebookIcon />
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground">Facebook</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              onClick={() => handleShare('email')}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Mail className="h-4 w-4" />
              <span className="text-sm">Email</span>
            </button>
            
            {navigator.share && (
              <button
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="text-sm">More...</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4 p-3 bg-[#2a2a2a] rounded-xl">
            <Input
              value={shareUrl}
              readOnly
              className="bg-transparent border-0 text-sm text-muted-foreground"
            />
            <Button size="sm" variant="ghost" onClick={handleCopyLink} className="shrink-0">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="bg-[#1e1e1e] border-[#333]">
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Enter a new name for this chat
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Chat name"
            className="bg-[#2a2a2a] border-[#333]"
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)} className="border-[#333]">
              Cancel
            </Button>
            <Button onClick={handleRename} className="gradient-bg">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#1e1e1e] border-[#333]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{chatName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#333]">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => onDelete(chatId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
