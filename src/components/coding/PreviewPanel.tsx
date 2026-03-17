import { useMemo } from 'react';
import { useCodingWorkspace } from '@/contexts/CodingWorkspaceContext';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function PreviewPanel() {
  const { files } = useCodingWorkspace();
  const [key, setKey] = useState(0);

  const previewHtml = useMemo(() => {
    // Find HTML file
    const htmlFile = files.find(f => f.path.endsWith('.html') || f.path.endsWith('index.html'));
    const cssFiles = files.filter(f => f.path.endsWith('.css'));
    const jsFiles = files.filter(f => f.path.endsWith('.js') && !f.path.endsWith('.test.js'));

    if (htmlFile) {
      let html = htmlFile.content;
      // Inject CSS
      const cssContent = cssFiles.map(f => f.content).join('\n');
      if (cssContent && !html.includes('<style>')) {
        html = html.replace('</head>', `<style>\n${cssContent}\n</style>\n</head>`);
      }
      // Inject JS
      const jsContent = jsFiles
        .filter(f => f.path !== htmlFile.path)
        .map(f => f.content).join('\n');
      if (jsContent && !html.includes('<script>')) {
        html = html.replace('</body>', `<script>\n${jsContent}\n</script>\n</body>`);
      }
      return html;
    }

    // If no HTML, try to build a basic preview
    const css = cssFiles.map(f => `<style>${f.content}</style>`).join('\n');
    const js = jsFiles.map(f => `<script>${f.content}</script>`).join('\n');

    if (css || js) {
      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${css}</head><body>
<div id="root"></div>
${js}</body></html>`;
    }

    return null;
  }, [files]);

  if (!previewHtml) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center text-muted-foreground">
          <div className="text-4xl mb-3">👁️</div>
          <p className="text-sm">No preview available</p>
          <p className="text-xs mt-1">Add an HTML file to see the preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground">Live Preview</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setKey(k => k + 1)}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-hidden bg-white">
        <iframe
          key={key}
          srcDoc={previewHtml}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-modals allow-same-origin"
          title="Preview"
        />
      </div>
    </div>
  );
}
