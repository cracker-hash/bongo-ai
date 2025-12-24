import { useRef, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { WelcomeScreen } from './WelcomeScreen';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMode } from '@/types/chat';
import { QuizInterface } from '@/components/quiz/QuizInterface';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ChatContainer() {
  const { messages, sendMessage, currentMode, setCurrentMode, isLoading, sidebarOpen, setSidebarOpen } = useChat();
  const { isAuthenticated } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizTopic, setQuizTopic] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (content: string) => {
    // Check if this is a quiz request
    if (currentMode === 'quiz' && isAuthenticated) {
      setQuizTopic(content);
      setShowQuiz(true);
      return;
    }

    await sendMessage(content);
  };

  const handleQuickPrompt = (prompt: string, mode: ChatMode) => {
    if (isAuthenticated) {
      setCurrentMode(mode);
    }
    handleSendMessage(prompt);
  };

  const handleQuizComplete = (score: number, total: number) => {
    setShowQuiz(false);
    sendMessage(`Quiz completed! I scored ${score}/${total} (${Math.round((score/total)*100)}%).`);
  };

  return (
    <div 
      className="flex flex-col h-[calc(100vh-64px)] transition-all duration-300"
      style={{ 
        marginLeft: sidebarOpen ? '288px' : '0',
        width: sidebarOpen ? 'calc(100% - 288px)' : '100%'
      }}
    >
      {/* Mobile header with menu button */}
      {!sidebarOpen && (
        <div className="lg:hidden flex items-center gap-2 p-3 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="h-9 w-9"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-medium text-sm">Bongo AI</span>
        </div>
      )}

      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        {messages.length === 0 && !showQuiz ? (
          <WelcomeScreen onPromptClick={handleQuickPrompt} />
        ) : (
          <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
            {messages.map((message, index) => (
              <ChatBubble 
                key={message.id} 
                message={message}
                onRegenerate={
                  message.role === 'assistant' && index === messages.length - 1
                    ? () => {
                        // Find the last user message and resend
                        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                        if (lastUserMsg) {
                          sendMessage(lastUserMsg.content);
                        }
                      }
                    : undefined
                }
              />
            ))}
            {showQuiz && (
              <QuizInterface 
                topic={quizTopic} 
                onComplete={handleQuizComplete} 
              />
            )}
            {isLoading && <TypingIndicator />}
          </div>
        )}
      </div>

      {/* Input area */}
      <ChatInput onSend={handleSendMessage} />
    </div>
  );
}