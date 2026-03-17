import { Play, Download, Github, X, Eye, EyeOff, FolderOpen } from 'lucide-react';
import { useCodingWorkspace } from '@/contexts/CodingWorkspaceContext';
import { Button } from '@/components/ui/button';
import { GithubExportDialog } from '@/components/builder/GithubExportDialog';
import { useState } from 'react';

export function WorkspaceTopBar() {
  const { projectName, showPreview, setShowPreview, downloadProject, clearProject, files } = useCodingWorkspace();
  const [showGithub, setShowGithub] = useState(false);

  // Assemble all code for GitHub export
  const allCode = files.map(f => `// === ${f.path} ===\n${f.content}`).join('\n\n');

  return (
    <>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{projectName}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
            {files.length} files
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={showPreview ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPreview ? 'Hide Preview' : 'Preview'}
          </Button>

          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={downloadProject}>
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>

          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowGithub(true)}>
            <Github className="h-3.5 w-3.5" />
            GitHub
          </Button>

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearProject}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <GithubExportDialog open={showGithub} onOpenChange={setShowGithub} code={allCode} />
    </>
  );
}
