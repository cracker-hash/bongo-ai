import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Github, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface GithubExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
}

export function GithubExportDialog({ open, onOpenChange, code }: GithubExportDialogProps) {
  const [repoName, setRepoName] = useState('my-website');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleExport = async () => {
    if (!repoName.trim()) {
      toast.error('Please enter a repository name');
      return;
    }

    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('github-export', {
        body: {
          repoName: repoName.trim().replace(/\s+/g, '-').toLowerCase(),
          isPrivate,
          files: [
            { path: 'index.html', content: code },
            { path: 'README.md', content: `# ${repoName}\n\nGenerated with Wiser AI Builder.\n` },
          ],
        },
      });

      if (error) throw error;

      if (data?.repoUrl) {
        setRepoUrl(data.repoUrl);
        toast.success('Successfully exported to GitHub!');
      } else if (data?.error === 'no_github_account') {
        toast.error('No GitHub account connected. Please connect your GitHub account first.');
        onOpenChange(false);
        navigate('/connected-accounts');
      } else {
        throw new Error(data?.message || 'Export failed');
      }
    } catch (err: any) {
      console.error('GitHub export error:', err);
      toast.error(err.message || 'Failed to export to GitHub');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadZip = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repoName || 'website'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('File downloaded!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Export to GitHub
          </DialogTitle>
        </DialogHeader>

        {repoUrl ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-sm">Repository created successfully!</span>
            </div>
            <Button className="w-full gap-2" onClick={() => window.open(repoUrl, '_blank')}>
              <ExternalLink className="h-4 w-4" />
              Open Repository
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="repo-name">Repository Name</Label>
                <Input
                  id="repo-name"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="my-website"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="private-repo">Private Repository</Label>
                <Switch id="private-repo" checked={isPrivate} onCheckedChange={setIsPrivate} />
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button onClick={handleExport} disabled={isExporting} className="w-full gap-2">
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
                {isExporting ? 'Exporting...' : 'Export to GitHub'}
              </Button>
              <Button variant="outline" onClick={handleDownloadZip} className="w-full">
                Download as HTML
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Need Check icon for success state
function Check(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  );
}
