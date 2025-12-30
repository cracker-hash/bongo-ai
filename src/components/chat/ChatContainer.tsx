import { useRef, useEffect, useState, useCallback } from 'react';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { WelcomeScreen } from './WelcomeScreen';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMode, QuizQuestion, DocumentAttachment } from '@/types/chat';
import { QuizInterface } from '@/components/quiz/QuizInterface';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuizState {
  isActive: boolean;
  questions: QuizQuestion[];
  documentContext: string;
}

export function ChatContainer() {
  const { messages, sendMessage, currentMode, setCurrentMode, isLoading, sidebarOpen, setSidebarOpen } = useChat();
  const { isAuthenticated } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [quizState, setQuizState] = useState<QuizState>({
    isActive: false,
    questions: [],
    documentContext: ''
  });
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Process document and generate quiz questions
  const processDocumentForQuiz = useCallback(async (document: DocumentAttachment) => {
    setIsProcessingDocument(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-document', {
        body: {
          content: document.content,
          filename: document.filename,
          mode: 'quiz'
        }
      });

      if (error) throw error;

      if (data?.questions && Array.isArray(data.questions)) {
        const formattedQuestions: QuizQuestion[] = data.questions.map((q: any, index: number) => ({
          id: `q-${index}-${Date.now()}`,
          question: q.question,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          hint: q.hint,
          attempts: 0
        }));

        setQuizState({
          isActive: true,
          questions: formattedQuestions,
          documentContext: document.content
        });
      }
    } catch (error) {
      console.error('Error processing document for quiz:', error);
      toast.error('Failed to generate quiz questions. Please try again.');
    } finally {
      setIsProcessingDocument(false);
    }
  }, []);

  const handleSendMessage = async (
    content: string, 
    images?: string[], 
    document?: { filename: string; content: string; type: string }
  ) => {
    // If in quiz mode with a document, start the quiz
    if (currentMode === 'quiz' && document && isAuthenticated) {
      const docAttachment: DocumentAttachment = {
        filename: document.filename,
        content: document.content,
        type: document.type as 'pdf' | 'doc' | 'txt' | 'image'
      };
      await processDocumentForQuiz(docAttachment);
      await sendMessage(`Starting quiz based on: ${document.filename}`);
      return;
    }

    // Pass images to sendMessage if provided
    await sendMessage(content, images);
  };

  const handleQuickPrompt = (prompt: string, mode: ChatMode) => {
    if (isAuthenticated) {
      setCurrentMode(mode);
    }
    handleSendMessage(prompt);
  };

  // AI-powered answer validation
  const handleAnswerSubmit = useCallback(async (
    questionId: string, 
    answer: string, 
    question: string
  ): Promise<{ isCorrect: boolean; explanation: string; additionalInfo?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('process-document', {
        body: {
          mode: 'validate-answer',
          question,
          userAnswer: answer,
          documentContext: quizState.documentContext
        }
      });

      if (error) throw error;

      return {
        isCorrect: data?.isCorrect ?? false,
        explanation: data?.explanation ?? 'Unable to validate answer.',
        additionalInfo: data?.additionalInfo
      };
    } catch (error) {
      console.error('Error validating answer:', error);
      return {
        isCorrect: false,
        explanation: 'An error occurred while checking your answer. Please try again.'
      };
    }
  }, [quizState.documentContext]);

  const handleQuizComplete = useCallback((score: number, total: number) => {
    setQuizState({ isActive: false, questions: [], documentContext: '' });
    const percentage = Math.round((score / total) * 100);
    sendMessage(`🎉 Quiz completed! I scored ${score}/${total} (${percentage}%). ${
      percentage >= 80 ? "Excellent work!" : 
      percentage >= 60 ? "Good effort! Keep studying." : 
      "Time to review the material."
    }`);
  }, [sendMessage]);

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
          <span className="font-medium text-sm">Wiser AI</span>
        </div>
      )}

      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        {messages.length === 0 && !quizState.isActive ? (
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
                        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                        if (lastUserMsg) {
                          sendMessage(lastUserMsg.content);
                        }
                      }
                    : undefined
                }
              />
            ))}
            {quizState.isActive && quizState.questions.length > 0 && (
              <QuizInterface 
                questions={quizState.questions}
                documentContext={quizState.documentContext}
                onComplete={handleQuizComplete}
                onAnswerSubmit={handleAnswerSubmit}
              />
            )}
            {isProcessingDocument && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Generating quiz questions from your document...</span>
                </div>
              </div>
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