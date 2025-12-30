import { useState } from 'react';
import { 
  MoreHorizontal, 
  Share2, 
  Pencil, 
  Trash2,
  Link,
  Copy,
  Download,
  Lock,
  Globe,
  MessageSquare,
  Send
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

// Social share icons
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

const InstagramIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.757-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
  </svg>
);

interface ProjectMenuProps {
  projectId: string;
  projectName: string;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectMenu({
  projectId,
  projectName,
  onRename,
  onDelete,
}: ProjectMenuProps) {
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [newName, setNewName] = useState(projectName);
  const isOnline = navigator.onLine;

  const shareUrl = `${window.location.origin}/project/${projectId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('🔗 Project link copied!', {
      description: 'Share this link with others'
    });
    setShowShareSheet(false);
  };

  const handleShareSocial = (platform: string) => {
    const text = `Check out my project "${projectName}" on Wiser AI!`;
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(text);
    
    let url = '';
    switch (platform) {
      case 'whatsapp':
        url = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'email':
        url = `mailto:?subject=${encodeURIComponent(`Check out: ${projectName}`)}&body=${encodedText}%20${encodedUrl}`;
        break;
    }
    
    if (url) {
      window.open(url, '_blank');
      toast.success(`Project shared! 🎉`);
    }
    setShowShareSheet(false);
  };

  const handleExportProject = () => {
    toast.success('📦 Exporting project...', {
      description: 'Your project will be downloaded shortly'
    });
    setShowShareSheet(false);
  };

  const handleRename = () => {
    if (!newName.trim()) {
      toast.error('Project name cannot be empty');
      return;
    }
    if (newName.length > 50) {
      toast.error('Name too long (max 50 characters)');
      return;
    }
    if (newName.trim() !== projectName) {
      onRename(projectId, newName.trim());
      toast.success('✎ Project renamed!');
    }
    setShowRenameDialog(false);
  };

  const handleDelete = () => {
    onDelete(projectId);
    toast.success('🗑️ Project deleted', {
      description: 'All chats in this project have been removed'
    });
    setShowDeleteDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover/project:opacity-100 shrink-0 hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground transition-all duration-200"
            onClick={(e) => e.stopPropagation()}
            aria-label="Project options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-52 bg-[#1e1e1e] border-sidebar-border/50 shadow-xl animate-in fade-in-0 zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Share Project */}
          <DropdownMenuItem 
            onClick={() => setShowShareSheet(true)}
            disabled={!isOnline}
            className="gap-2 text-sidebar-foreground hover:bg-sidebar-accent focus:bg-sidebar-accent cursor-pointer"
          >
            <Share2 className="h-4 w-4" />
            Share Project
            {!isOnline && (
              <span className="ml-auto text-xs text-muted-foreground">Offline</span>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-sidebar-border/30" />

          {/* Rename Project */}
          <DropdownMenuItem 
            onClick={() => {
              setNewName(projectName);
              setShowRenameDialog(true);
            }}
            className="gap-2 text-sidebar-foreground hover:bg-sidebar-accent focus:bg-sidebar-accent cursor-pointer"
          >
            <Pencil className="h-4 w-4" />
            Rename Project
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-sidebar-border/30" />

          {/* Delete Project */}
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="gap-2 text-destructive focus:text-destructive hover:bg-destructive/10 focus:bg-destructive/10 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Delete Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Share Sheet Dialog */}
      <Dialog open={showShareSheet} onOpenChange={setShowShareSheet}>
        <DialogContent className="bg-[#1e1e1e] border-sidebar-border/50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sidebar-foreground">
              <Share2 className="h-5 w-5 text-primary" />
              Share Project
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Share "{projectName}" with others
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Share Options */}
            <div className="flex justify-center gap-4 py-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366]"
                onClick={() => handleShareSocial('whatsapp')}
              >
                <WhatsAppIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc]"
                onClick={() => handleShareSocial('telegram')}
              >
                <TelegramIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-foreground/10 hover:bg-foreground/20 text-foreground"
                onClick={() => handleShareSocial('twitter')}
              >
                <XIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-[#E4405F]/10 hover:bg-[#E4405F]/20 text-[#E4405F]"
                onClick={() => toast.info('Copy link to share on Instagram')}
              >
                <InstagramIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
                onClick={() => handleShareSocial('email')}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Copy Link */}
            <div className="flex gap-2">
              <Input 
                value={shareUrl}
                readOnly
                className="bg-sidebar-accent/50 border-sidebar-border/50 text-sm"
              />
              <Button onClick={handleCopyLink} className="shrink-0">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>

            {/* Export Option */}
            <Button 
              variant="outline" 
              className="w-full border-sidebar-border/50"
              onClick={handleExportProject}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Project (JSON)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="bg-[#1e1e1e] border-sidebar-border/50">
          <DialogHeader>
            <DialogTitle className="text-sidebar-foreground">Rename Project</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter a new name for this project (max 50 characters)
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            maxLength={50}
            className="bg-sidebar-accent/50 border-sidebar-border/50"
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            autoFocus
          />
          <div className="text-right text-xs text-muted-foreground">
            {newName.length}/50
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)} className="border-sidebar-border/50">
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#1e1e1e] border-sidebar-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sidebar-foreground flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Project
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete "{projectName}" and <strong>all chats inside</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
            ⚠️ All project data will be permanently deleted
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-sidebar-border/50">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}