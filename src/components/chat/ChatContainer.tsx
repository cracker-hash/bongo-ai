import { useRef, useEffect, useState, useCallback } from 'react';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { WelcomeScreen } from './WelcomeScreen';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMode, QuizQuestion, DocumentAttachment } from '@/types/chat';
import { QuizInterface } from '@/components/quiz/QuizInterface';
import { Menu, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuizState {
  isActive: boolean;
  questions: QuizQuestion[];
  documentContext: string;
}

export function ChatContainer() {
  const { messages, sendMessage, addAssistantMessage, currentMode, setCurrentMode, isLoading, sidebarOpen, setSidebarOpen } = useChat();
  const { isAuthenticated } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [quizState, setQuizState] = useState<QuizState>({
    isActive: false,
    questions: [],
    documentContext: ''
  });
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Track scroll position to show/hide scroll-to-bottom button
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && messages.length > 0);
    }
  }, [messages.length]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

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

  // Process document for Study mode
  const processDocumentForStudy = useCallback(async (document: DocumentAttachment): Promise<string> => {
    try {
      console.log('Processing document for study:', document.filename);
      const { data, error } = await supabase.functions.invoke('process-document', {
        body: {
          content: document.content,
          filename: document.filename,
          mode: 'study'
        }
      });

      console.log('Study mode response:', data);
      if (error) {
        console.error('Study mode error:', error);
        throw error;
      }
      return data?.summary || data?.analysis || 'Document processed successfully.';
    } catch (error) {
      console.error('Error processing document for study:', error);
      return 'Failed to analyze document. Please try again.';
    }
  }, []);

  const handleSendMessage = async (
    content: string, 
    images?: string[], 
    document?: { filename: string; content: string; type: string }
  ) => {
    const docAttachment: DocumentAttachment | undefined = document ? {
      filename: document.filename,
      content: document.content,
      type: document.type as 'pdf' | 'doc' | 'txt' | 'image'
    } : undefined;

    // If in quiz mode with a document, start the quiz
    if (currentMode === 'quiz' && docAttachment && isAuthenticated) {
      // Send user message with document attached (for display)
      await sendMessage(content || `📄 Uploaded: ${docAttachment.filename}`, images, docAttachment);
      await processDocumentForQuiz(docAttachment);
      return;
    }

    // If in study mode with a document, process and respond
    if (currentMode === 'study' && docAttachment) {
      setIsProcessingDocument(true);
      // Send user message with document attached
      await sendMessage(content || `📄 Analyzing: ${docAttachment.filename}`, images, docAttachment);
      
      // Process document and get analysis
      const analysis = await processDocumentForStudy(docAttachment);
      
      // Add the AI analysis as an assistant message directly
      addAssistantMessage(analysis);
      setIsProcessingDocument(false);
      return;
    }

    // Regular message - pass document for display if attached
    await sendMessage(content, images, docAttachment);
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
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin relative"
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

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            onClick={scrollToBottom}
            size="icon"
            variant="secondary"
            className="fixed bottom-28 right-8 z-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Input area - fixed at bottom */}
      <div className="flex-shrink-0">
        <ChatInput onSend={handleSendMessage} />
      </div>
    </div>
  );
}