import { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { FileTreeNode, buildFileTree } from '@/types/codingWorkspace';
import { useCodingWorkspace } from '@/contexts/CodingWorkspaceContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const colors: Record<string, string> = {
    js: 'text-yellow-400', jsx: 'text-yellow-400', ts: 'text-blue-400', tsx: 'text-blue-400',
    html: 'text-orange-400', css: 'text-purple-400', json: 'text-yellow-300',
    py: 'text-green-400', md: 'text-muted-foreground', env: 'text-muted-foreground',
  };
  return <File className={cn('h-4 w-4 flex-shrink-0', colors[ext] || 'text-muted-foreground')} />;
}

function TreeNode({ node, depth = 0 }: { node: FileTreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const { openFile, activeTab, deleteFile } = useCodingWorkspace();

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 w-full px-2 py-1 text-xs hover:bg-muted/50 rounded-sm transition-colors text-foreground/80"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />}
          {expanded ? <FolderOpen className="h-4 w-4 flex-shrink-0 text-blue-400" /> : <Folder className="h-4 w-4 flex-shrink-0 text-blue-400" />}
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {expanded && node.children?.map(child => (
          <TreeNode key={child.path} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  const isActive = activeTab === node.path;

  return (
    <button
      onClick={() => openFile(node.path)}
      className={cn(
        'flex items-center gap-1.5 w-full px-2 py-1 text-xs rounded-sm transition-colors group',
        isActive ? 'bg-accent/20 text-accent-foreground' : 'hover:bg-muted/50 text-foreground/70'
      )}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <FileIcon name={node.name} />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileExplorer() {
  const { files, projectName, addFile } = useCodingWorkspace();
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const tree = buildFileTree(files);

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      addFile(newFileName.trim(), '');
      setNewFileName('');
      setShowNewFile(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/50 border-r border-border">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Explorer</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowNewFile(!showNewFile)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {showNewFile && (
        <div className="px-2 py-1.5 border-b border-border">
          <Input
            value={newFileName}
            onChange={e => setNewFileName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateFile()}
            placeholder="path/to/file.ext"
            className="h-7 text-xs"
            autoFocus
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
        <div className="px-2 py-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90 mb-1">
            <Folder className="h-4 w-4 text-blue-400" />
            {projectName}
          </div>
        </div>
        {tree.map(node => (
          <TreeNode key={node.path} node={node} depth={1} />
        ))}
        {files.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            No files yet. Ask WiserAI to build something!
          </div>
        )}
      </div>
    </div>
  );
}
