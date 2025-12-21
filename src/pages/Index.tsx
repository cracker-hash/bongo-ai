import { ChatProvider } from '@/contexts/ChatContext';
import { TopBar } from '@/components/layout/TopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatContainer } from '@/components/chat/ChatContainer';

const Index = () => {
  return (
    <ChatProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <TopBar />
        <Sidebar />
        <main className="flex-1 pt-16">
          <ChatContainer />
        </main>
      </div>
    </ChatProvider>
  );
};

export default Index;
