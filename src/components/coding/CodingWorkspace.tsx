import { useEffect, useRef } from 'react';
import { useCodingWorkspace } from '@/contexts/CodingWorkspaceContext';
import { useChat } from '@/contexts/ChatContext';
import { FileExplorer } from './FileExplorer';
import { CodeEditorPanel } from './CodeEditorPanel';
import { PreviewPanel } from './PreviewPanel';
import { WorkspaceTopBar } from './WorkspaceTopBar';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

export function CodingWorkspace() {
  const { isWorkspaceOpen, showPreview, parseAndLoadFromResponse } = useCodingWorkspace();
  const { messages, currentMode } = useChat();
  const lastProcessedRef = useRef<number>(0);

  // Watch for new assistant messages in coding mode and parse files
  useEffect(() => {
    if (currentMode !== 'coding') return;

    const newMessages = messages.slice(lastProcessedRef.current);
    lastProcessedRef.current = messages.length;

    for (const msg of newMessages) {
      if (msg.role === 'assistant' && msg.content) {
        parseAndLoadFromResponse(msg.content);
      }
    }
  }, [messages, currentMode, parseAndLoadFromResponse]);

  if (!isWorkspaceOpen) return null;

  return (
    <div className="flex flex-col h-full border-l border-border bg-background">
      <WorkspaceTopBar />

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* File Explorer */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
            <FileExplorer />
          </ResizablePanel>
          <ResizableHandle />

          {/* Editor + Preview */}
          {showPreview ? (
            <>
              <ResizablePanel defaultSize={40} minSize={25}>
                <CodeEditorPanel />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={25}>
                <PreviewPanel />
              </ResizablePanel>
            </>
          ) : (
            <ResizablePanel defaultSize={80} minSize={50}>
              <CodeEditorPanel />
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
