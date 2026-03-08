import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Eye, Code, Github, X, Download } from 'lucide-react';
import { PreviewFrame } from './PreviewFrame';
import { CodeEditor } from './CodeEditor';
import { GithubExportDialog } from './GithubExportDialog';

interface BuilderPanelProps {
  code: string;
  onCodeChange: (code: string) => void;
  onClose: () => void;
}

export function BuilderPanel({ code, onCodeChange, onClose }: BuilderPanelProps) {
  const [showExport, setShowExport] = useState(false);

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      <Tabs defaultValue="preview" className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
          <TabsList className="h-8 bg-transparent p-0 gap-1">
            <TabsTrigger value="preview" className="h-7 px-3 text-xs gap-1.5 data-[state=active]:bg-accent">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="code" className="h-7 px-3 text-xs gap-1.5 data-[state=active]:bg-accent">
              <Code className="h-3.5 w-3.5" />
              Code
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} title="Download HTML">
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowExport(true)} title="Export to GitHub">
              <Github className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
          <PreviewFrame code={code} />
        </TabsContent>
        <TabsContent value="code" className="flex-1 m-0 overflow-hidden">
          <CodeEditor code={code} onCodeChange={onCodeChange} />
        </TabsContent>
      </Tabs>

      <GithubExportDialog open={showExport} onOpenChange={setShowExport} code={code} />
    </div>
  );
}
