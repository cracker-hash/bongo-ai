import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChatProvider } from '@/contexts/ChatContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { AuthModal } from '@/components/auth/AuthModal';

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

const Index = () => {
  return (
    <AuthProvider>
      <ChatProvider>
        <div className="min-h-screen bg-background">
          <SignupTrigger />
          <TopBar />
          <Sidebar />
          <main className="pt-16 min-h-screen">
            <ChatContainer />
          </main>
          <AuthModal />
        </div>
      </ChatProvider>
    </AuthProvider>
  );
};

export default Index;