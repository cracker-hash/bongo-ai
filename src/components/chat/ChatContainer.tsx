import { useRef, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { WelcomeScreen } from './WelcomeScreen';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMode, MODE_INFO } from '@/types/chat';
import { QuizInterface } from '@/components/quiz/QuizInterface';

// Bongo AI response generator
function generateBongoResponse(userMessage: string, mode: ChatMode): string {
  const lowerMessage = userMessage.toLowerCase();
  
  // Identity questions
  if (lowerMessage.includes('who made you') || lowerMessage.includes('who created you') || lowerMessage.includes('who are you')) {
    return `I was made in 2025 by an artificial intelligence expert called Tito Oscar Mwaisengela, a Tanzanian student at the University of Dar es Salaam, College of Information and Communication Technology.

I can assist with research, studying, quizzes, games, image generation, voice chats, and more. I'm helpful to humans by providing accurate information, educational tools, entertainment, productivity features, and creative support, all while promoting ethical AI use and accessibility, especially in education and innovation across Africa and beyond. 🌍✨`;
  }

  // Mode-specific responses
  const modeResponses: Record<ChatMode, string[]> = {
    conversation: [
      `That's a fascinating thought! 🤔 ${userMessage.length > 50 ? "You've really given this some thought." : "I love where you're going with this."}`,
      `Ah, great question! Let me share my perspective on that...`,
      `You know, that reminds me of something interesting. Let me tell you about it!`,
    ],
    study: [
      `Let me break this down for you in simple terms! 📚\n\nHere's what you need to know:\n\n1. The key concept is...\n2. This connects to...\n3. A practical example would be...`,
      `Great topic to study! Here's a simplified explanation that should help you understand better...`,
    ],
    quiz: [
      `🎯 Quiz Time!\n\nI'll start an interactive quiz for you on this topic. Get ready to test your knowledge!`,
      `Let's test your knowledge! 🧠 Starting quiz mode...`,
    ],
    research: [
      `📋 Research Summary:\n\nBased on current information, here are the key findings:\n\n• Key Point 1: ...\n• Key Point 2: ...\n• Key Point 3: ...\n\n📎 Sources: [Academic journals and reliable sources would be cited here]`,
      `Excellent research topic! Let me compile the most relevant information for you...`,
    ],
    game: [
      `🎮 Game On!\n\nLet's play! I'm thinking of something...\n\nYou have 5 guesses. Each guess, I'll tell you if you're getting warmer or colder!\n\nMake your first guess!`,
      `Ready for a word puzzle? 🧩 Let's see how sharp your mind is today!`,
    ],
    creative: [
      `✨ Creative Mode Activated!\n\nHere's an idea that might spark your imagination:\n\n${userMessage.includes('story') ? 'Once upon a time, in a land where technology and tradition danced together...' : 'What if we approached this from a completely different angle?'}`,
      `I love the creative energy! Let me brainstorm some unique ideas for you...`,
    ],
    coding: [
      `💻 Let me help you with that code!\n\n\`\`\`javascript\n// Here's a solution approach:\nfunction solution() {\n  // Your logic here\n  return result;\n}\n\`\`\`\n\nWould you like me to explain how this works?`,
      `Great programming question! Here's how I'd approach this problem...`,
    ],
  };

  const responses = modeResponses[mode];
  return responses[Math.floor(Math.random() * responses.length)];
}

export function ChatContainer() {
  const { messages, addMessage, currentMode, setCurrentMode, isLoading, setIsLoading, sidebarOpen } = useChat();
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
    addMessage(content, 'user');
    setIsLoading(true);

    // Check if this is a quiz request
    if (currentMode === 'quiz' && isAuthenticated) {
      setQuizTopic(content);
      setShowQuiz(true);
      setIsLoading(false);
      return;
    }

    // Simulate AI response delay
    setTimeout(() => {
      const response = generateBongoResponse(content, currentMode);
      addMessage(response, 'assistant');
      setIsLoading(false);
    }, 1000 + Math.random() * 1000);
  };

  const handleQuickPrompt = (prompt: string, mode: ChatMode) => {
    if (isAuthenticated) {
      setCurrentMode(mode);
    }
    handleSendMessage(prompt);
  };

  const handleQuizComplete = (score: number, total: number) => {
    setShowQuiz(false);
    addMessage(`Quiz completed! You scored ${score}/${total} (${Math.round((score/total)*100)}%). Great effort! 🎉`, 'assistant');
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
