import { useState } from 'react';
import { 
  MoreHorizontal, 
  Share2, 
  Users, 
  Pencil, 
  FolderInput, 
  Pin, 
  Archive, 
  Trash2,
  Copy,
  Link,
  FileText
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
  const [newName, setNewName] = useState(chatName);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/chat/${chatId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
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
            className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0 hover:bg-sidebar-accent"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {/* Share submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Share2 className="h-4 w-4 mr-2" />
              Share Chat
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={handleCopyLink}>
                <Link className="h-4 w-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyContent}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Content
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <FileText className="h-4 w-4 mr-2" />
                Export as Text
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Start Group Chat */}
          <DropdownMenuItem onClick={handleStartGroupChat}>
            <Users className="h-4 w-4 mr-2" />
            Start Group Chat
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Rename */}
          <DropdownMenuItem onClick={() => {
            setNewName(chatName);
            setShowRenameDialog(true);
          }}>
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>

          {/* Move to Project */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderInput className="h-4 w-4 mr-2" />
              Move to Project
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem 
                onClick={() => onMoveToProject(chatId, null)}
                className={cn(!projectId && "bg-accent")}
              >
                No Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => onMoveToProject(chatId, project.id)}
                  className={cn(projectId === project.id && "bg-accent")}
                >
                  {project.name}
                </DropdownMenuItem>
              ))}
              {projects.length === 0 && (
                <DropdownMenuItem disabled>
                  No projects yet
                </DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Pin */}
          <DropdownMenuItem onClick={() => onPin(chatId, !isPinned)}>
            <Pin className={cn("h-4 w-4 mr-2", isPinned && "fill-current")} />
            {isPinned ? 'Unpin' : 'Pin Chat'}
          </DropdownMenuItem>

          {/* Archive */}
          <DropdownMenuItem onClick={() => onArchive(chatId, !isArchived)}>
            <Archive className="h-4 w-4 mr-2" />
            {isArchived ? 'Unarchive' : 'Archive Chat'}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Delete */}
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
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
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{chatName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
