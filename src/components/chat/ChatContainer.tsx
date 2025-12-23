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

export function ChatContainer() {
  const { messages, sendMessage, currentMode, setCurrentMode, isLoading, sidebarOpen } = useChat();
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
      className="flex flex-col h-full transition-all duration-300"
      style={{ marginLeft: sidebarOpen ? '288px' : '0' }}
    >
      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        {messages.length === 0 && !showQuiz ? (
          <WelcomeScreen onPromptClick={handleQuickPrompt} />
        ) : (
          <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
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
