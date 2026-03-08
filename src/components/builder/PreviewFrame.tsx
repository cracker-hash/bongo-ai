import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Monitor, Tablet, Smartphone, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreviewFrameProps {
  code: string;
}

type Viewport = 'desktop' | 'tablet' | 'mobile';

const viewportSizes: Record<Viewport, { width: string; icon: typeof Monitor }> = {
  desktop: { width: '100%', icon: Monitor },
  tablet: { width: '768px', icon: Tablet },
  mobile: { width: '375px', icon: Smartphone },
};

export function PreviewFrame({ code }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [key, setKey] = useState(0);

  useEffect(() => {
    setKey(k => k + 1);
  }, [code]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
        {(Object.keys(viewportSizes) as Viewport[]).map((vp) => {
          const Icon = viewportSizes[vp].icon;
          return (
            <Button
              key={vp}
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", viewport === vp && "bg-accent")}
              onClick={() => setViewport(vp)}
            >
              <Icon className="h-3.5 w-3.5" />
            </Button>
          );
        })}
        <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => setKey(k => k + 1)}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 flex items-start justify-center overflow-auto bg-muted/10 p-2">
        <iframe
          ref={iframeRef}
          key={key}
          srcDoc={code}
          sandbox="allow-scripts allow-modals"
          className="bg-background border border-border rounded-md shadow-sm h-full transition-all duration-200"
          style={{ width: viewportSizes[viewport].width, maxWidth: '100%' }}
          title="Preview"
        />
      </div>
    </div>
  );
}
