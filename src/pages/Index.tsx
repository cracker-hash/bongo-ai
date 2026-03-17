import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChatProvider, useChat } from '@/contexts/ChatContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CodingWorkspaceProvider, useCodingWorkspace } from '@/contexts/CodingWorkspaceContext';
import { TopBar } from '@/components/layout/TopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { CodingWorkspace } from '@/components/coding/CodingWorkspace';
import { AuthModal } from '@/components/auth/AuthModal';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

function SignupTrigger() {
  const [searchParams] = useSearchParams();
  const { setShowAuthModal, isAuthenticated } = useAuth();

  useEffect(() => {
    if (searchParams.get('signup') === 'true' && !isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [searchParams, isAuthenticated, setShowAuthModal]);

  return null;
}

function MainLayout() {
  const { currentMode, sidebarOpen } = useChat();
  const { isWorkspaceOpen } = useCodingWorkspace();

  const showWorkspace = currentMode === 'coding' && isWorkspaceOpen;

  return (
    <div className="min-h-screen bg-background">
      <SignupTrigger />
      <TopBar />
      <Sidebar />
      <main
        className="pt-16 h-screen transition-all duration-300"
        style={{
          marginLeft: sidebarOpen ? '288px' : '0',
          width: sidebarOpen ? 'calc(100% - 288px)' : '100%'
        }}
      >
        {showWorkspace ? (
          <div className="h-[calc(100vh-64px)]">
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={40} minSize={25}>
                <ChatContainerInner />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={60} minSize={35}>
                <CodingWorkspace />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        ) : (
          <ChatContainer />
        )}
      </main>
      <AuthModal />
    </div>
  );
}

/** Thin wrapper so ChatContainer doesn't duplicate sidebar margin logic when in workspace mode */
function ChatContainerInner() {
  return (
    <div className="h-full" style={{ marginLeft: 0, width: '100%' }}>
      <ChatContainer />
    </div>
  );
}

const Index = () => {
  return (
    <AuthProvider>
      <ChatProvider>
        <CodingWorkspaceProvider>
          <MainLayout />
        </CodingWorkspaceProvider>
      </ChatProvider>
    </AuthProvider>
  );
};

export default Index;
