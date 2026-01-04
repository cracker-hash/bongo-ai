import { ChatProvider } from '@/contexts/ChatContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { AuthModal } from '@/components/auth/AuthModal';
import { PodcastButton } from '@/components/podcast/PodcastButton';

const Index = () => {
  return (
    <AuthProvider>
      <ChatProvider>
        <div className="min-h-screen bg-background">
          <TopBar />
          <Sidebar />
          <main className="pt-16 min-h-screen">
            <ChatContainer />
          </main>
          <AuthModal />
          <PodcastButton />
        </div>
      </ChatProvider>
    </AuthProvider>
  );
};

export default Index;