import { useCallback } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { useCodingWorkspace } from '@/contexts/CodingWorkspaceContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import Editor from '@monaco-editor/react';

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const colors: Record<string, string> = {
    js: 'text-yellow-400', jsx: 'text-yellow-400', ts: 'text-blue-400', tsx: 'text-blue-400',
    html: 'text-orange-400', css: 'text-purple-400', json: 'text-yellow-300',
    py: 'text-green-400', md: 'text-muted-foreground',
  };
  return <span className={cn('text-xs', colors[ext] || 'text-muted-foreground')}>●</span>;
}

export function CodeEditorPanel() {
  const { openTabs, activeTab, setActiveTab, closeTab, getFileContent, updateFileContent, files } = useCodingWorkspace();
  const [copied, setCopied] = useState(false);

  const activeFile = files.find(f => f.path === activeTab);
  const content = activeTab ? getFileContent(activeTab) : undefined;

  const handleCopy = useCallback(async () => {
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [content]);

  const getMonacoLanguage = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      html: 'html', css: 'css', json: 'json', md: 'markdown',
      py: 'python', yml: 'yaml', yaml: 'yaml', sh: 'shell',
      sql: 'sql', xml: 'xml', svg: 'xml', php: 'php', rb: 'ruby',
      go: 'go', rs: 'rust', java: 'java', env: 'plaintext',
    };
    return map[ext] || 'plaintext';
  };

  if (openTabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center text-muted-foreground">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-sm">Select a file to start editing</p>
          <p className="text-xs mt-1">Use the file explorer on the left</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Tabs */}
      <div className="flex items-center border-b border-border bg-muted/30 overflow-x-auto scrollbar-thin">
        {openTabs.map(path => {
          const fileName = path.split('/').pop() || path;
          const isActive = path === activeTab;
          return (
            <div
              key={path}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-border cursor-pointer min-w-0 flex-shrink-0 group',
                isActive ? 'bg-background text-foreground border-b-2 border-b-primary' : 'text-muted-foreground hover:bg-muted/50'
              )}
              onClick={() => setActiveTab(path)}
            >
              <FileIcon name={fileName} />
              <span className="truncate max-w-[120px]">{fileName}</span>
              <button
                onClick={e => { e.stopPropagation(); closeTab(path); }}
                className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
        <div className="ml-auto flex items-center px-2">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {activeTab && content !== undefined && (
          <Editor
            key={activeTab}
            height="100%"
            language={getMonacoLanguage(activeTab)}
            value={content}
            onChange={val => val !== undefined && updateFileContent(activeTab, val)}
            theme="vs-dark"
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderLineHighlight: 'line',
              padding: { top: 8 },
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              bracketPairColorization: { enabled: true },
              automaticLayout: true,
            }}
          />
        )}
      </div>
    </div>
  );
}
