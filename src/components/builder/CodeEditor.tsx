import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
}

export function CodeEditor({ code, onCodeChange }: CodeEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/30">
        <span className="text-xs font-mono text-muted-foreground">index.html</span>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Preview' : 'Edit'}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {isEditing ? (
          <textarea
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            className="w-full h-full p-4 bg-[#282c34] text-[#abb2bf] font-mono text-sm resize-none focus:outline-none"
            spellCheck={false}
          />
        ) : (
          <SyntaxHighlighter
            language="html"
            style={oneDark}
            customStyle={{ margin: 0, borderRadius: 0, height: '100%', fontSize: '13px' }}
            showLineNumbers
          >
            {code}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
}
