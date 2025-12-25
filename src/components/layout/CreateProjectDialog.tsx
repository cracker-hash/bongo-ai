import { useState } from 'react';
import { Folder, FolderHeart, FolderCode, FolderOpen, Briefcase, GraduationCap, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const ICONS = [
  { id: 'folder', icon: Folder, label: 'Default' },
  { id: 'folder-open', icon: FolderOpen, label: 'Open' },
  { id: 'folder-heart', icon: FolderHeart, label: 'Personal' },
  { id: 'folder-code', icon: FolderCode, label: 'Code' },
  { id: 'briefcase', icon: Briefcase, label: 'Work' },
  { id: 'graduation-cap', icon: GraduationCap, label: 'Study' },
  { id: 'gamepad', icon: Gamepad2, label: 'Games' },
];

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, icon: string, description?: string) => Promise<void>;
}

export function CreateProjectDialog({ open, onOpenChange, onCreate }: CreateProjectDialogProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('folder');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    setIsCreating(true);
    try {
      await onCreate(name.trim(), icon, description.trim() || undefined);
      setName('');
      setIcon('folder');
      setDescription('');
      onOpenChange(false);
    } finally {
      setIsCreating(false);
    }
  };

  const IconComponent = ICONS.find(i => i.id === icon)?.icon || Folder;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Organize your chats into project folders
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <div className="flex gap-2">
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <IconComponent className="h-5 w-5" />
              </div>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Project"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((item) => (
                <Button
                  key={item.id}
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-10 w-10",
                    icon === item.id && "border-primary bg-primary/10"
                  )}
                  onClick={() => setIcon(item.id)}
                >
                  <item.icon className="h-5 w-5" />
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!name.trim() || isCreating}
            className="gradient-bg"
          >
            {isCreating ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
