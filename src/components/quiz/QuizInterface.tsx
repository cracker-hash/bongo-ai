import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  Trophy, 
  ArrowRight, 
  Sparkles,
  BookOpen,
  Timer,
  Volume2,
  RotateCcw,
  Send,
  Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { speak, getVoiceSettings } from '@/lib/textToSpeech';

interface QuizQuestion {
  id: string;
  question: string;
  correctAnswer?: string;
  explanation?: string;
  hint?: string;
  userAnswer?: string;
  isCorrect?: boolean;
  attempts: number;
}

interface QuizInterfaceProps {
  questions: QuizQuestion[];
  documentContext?: string;
  onComplete: (score: number, total: number) => void;
  onAnswerSubmit: (questionId: string, answer: string, question: string) => Promise<{
    isCorrect: boolean;
    explanation: string;
    additionalInfo?: string;
  }>;
}

export function QuizInterface({ 
  questions, 
  documentContext, 
  onComplete, 
  onAnswerSubmit 
}: QuizInterfaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; explanation: string; additionalInfo?: string } | null>(null);
  const [localQuestions, setLocalQuestions] = useState(questions);
  const [showHint, setShowHint] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [quizComplete, setQuizComplete] = useState(false);

  const currentQuestion = localQuestions[currentIndex];
  const score = localQuestions.filter(q => q.isCorrect).length;
  const progress = ((currentIndex + (showResult && lastResult?.isCorrect ? 1 : 0)) / localQuestions.length) * 100;

  // Timer effect
  useEffect(() => {
    if (timerEnabled && timeLeft > 0 && !showResult) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timerEnabled, timeLeft, showResult]);

  const speakText = useCallback((text: string) => {
    const settings = getVoiceSettings();
    if (settings.enabled) {
      speak({
        text,
        voice: settings.voiceId,
        rate: settings.speed,
        useElevenLabs: settings.useElevenLabs
      });
    }
  }, []);

  const handleSubmit = async () => {
    if (!userAnswer.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await onAnswerSubmit(currentQuestion.id, userAnswer, currentQuestion.question);
      setLastResult(result);
      setShowResult(true);

      // Update local question state
      setLocalQuestions(prev => prev.map((q, i) => 
        i === currentIndex 
          ? { ...q, userAnswer, isCorrect: result.isCorrect, attempts: q.attempts + 1 }
          : q
      ));

      // Speak feedback
      if (result.isCorrect) {
        speakText(`Correct! ${result.additionalInfo?.slice(0, 150) || 'Great job!'}`);
        // Auto-advance after delay
        setTimeout(() => {
          if (currentIndex < localQuestions.length - 1) {
            handleNext();
          } else {
            completeQuiz();
          }
        }, 4000);
      } else {
        speakText(`Not quite right. ${result.explanation.slice(0, 200)}`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check answer. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < localQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer('');
      setShowResult(false);
      setLastResult(null);
      setShowHint(false);
      setTimeLeft(30);
    }
  };

  const handleTryAgain = () => {
    setUserAnswer('');
    setShowResult(false);
    setLastResult(null);
  };

  const completeQuiz = () => {
    setQuizComplete(true);
    const finalScore = localQuestions.filter(q => q.isCorrect).length + (lastResult?.isCorrect ? 1 : 0);
    onComplete(finalScore, localQuestions.length);
  };

  const readQuestion = () => {
    speakText(currentQuestion.question);
  };

  if (quizComplete) {
    const finalScore = localQuestions.filter(q => q.isCorrect).length;
    const percentage = Math.round((finalScore / localQuestions.length) * 100);
    
    return (
      <div className="bg-gradient-to-br from-card to-muted/50 rounded-2xl p-8 border border-border/50 shadow-xl animate-fade-in max-w-2xl mx-auto">
        <div className="text-center space-y-6">
          {/* Trophy animation */}
          <div className="relative w-28 h-28 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full blur-2xl opacity-40 animate-pulse" />
            <div className="relative w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-xl">
              <Trophy className="w-14 h-14 text-white" />
            </div>
          </div>
          
          <div>
            <h2 className="text-3xl font-bold gradient-text mb-2">Quiz Complete!</h2>
            <p className="text-muted-foreground">You've finished all questions</p>
          </div>

          <div className="bg-muted/50 rounded-xl p-6 space-y-4">
            <div className="text-6xl font-bold">
              <span className={cn(
                percentage >= 70 ? "text-emerald-400" : 
                percentage >= 50 ? "text-amber-400" : "text-red-400"
              )}>
                {finalScore}
              </span>
              <span className="text-muted-foreground text-3xl">/{localQuestions.length}</span>
            </div>
            
            <Progress value={percentage} className="h-4" />
            
            <p className="text-xl font-medium">
              {percentage >= 90 && "🌟 Outstanding! You've mastered this material!"}
              {percentage >= 70 && percentage < 90 && "🎉 Great job! You have a solid understanding."}
              {percentage >= 50 && percentage < 70 && "👍 Good effort! Review the topics you missed."}
              {percentage < 50 && "📚 Keep studying! Review the material and try again."}
            </p>
          </div>

          <Button 
            onClick={() => {
              setQuizComplete(false);
              setCurrentIndex(0);
              setLocalQuestions(questions.map(q => ({ ...q, isCorrect: undefined, userAnswer: undefined, attempts: 0 })));
              setUserAnswer('');
              setShowResult(false);
              setLastResult(null);
            }}
            className="gap-2 gradient-bg hover:opacity-90 px-8 py-6 text-lg"
          >
            <RotateCcw className="w-5 h-5" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-card to-muted/50 rounded-2xl border border-border/50 shadow-xl overflow-hidden max-w-2xl mx-auto">
      {/* Header with progress */}
      <div className="bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 p-5 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="font-semibold text-lg">Quiz Mode</span>
              <p className="text-xs text-muted-foreground">Short-answer questions</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded-full">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-amber-400">{score}</span>
              <span className="text-amber-400/70 text-sm">pts</span>
            </div>
            {timerEnabled && (
              <div className={cn(
                "flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full font-mono text-sm",
                timeLeft <= 10 && "bg-red-500/20 text-red-400 animate-pulse"
              )}>
                <Timer className="w-4 h-4" />
                {timeLeft}s
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Progress value={progress} className="h-3 flex-1" />
          <span className="text-sm font-medium bg-muted/50 px-2 py-1 rounded">
            {currentIndex + 1}/{localQuestions.length}
          </span>
        </div>
      </div>

      {/* Question Area */}
      <div className="p-6 space-y-6">
        {/* Question */}
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Question {currentIndex + 1}</p>
              <h3 className="text-xl font-semibold leading-relaxed">
                {currentQuestion.question}
              </h3>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={readQuestion}
              className="flex-shrink-0 hover:bg-primary/20"
            >
              <Volume2 className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Hint button - appears after 2 failed attempts */}
          {currentQuestion.attempts >= 2 && !showResult && currentQuestion.hint && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHint(true)}
              className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 gap-2"
            >
              <Lightbulb className="w-4 h-4" />
              Need a hint?
            </Button>
          )}
          
          {showHint && currentQuestion.hint && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 animate-fade-in">
              <div className="flex items-center gap-2 text-amber-400 font-medium mb-2">
                <Lightbulb className="w-4 h-4" />
                Hint
              </div>
              <p className="text-muted-foreground">{currentQuestion.hint}</p>
            </div>
          )}
        </div>

        {/* Answer Input or Result */}
        {!showResult ? (
          <div className="space-y-4">
            <div className="relative">
              <Textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer here... Be specific and thorough in your response."
                className="min-h-[140px] bg-muted/30 border-2 border-border/50 focus:border-primary/50 resize-none text-base pr-14"
                disabled={isSubmitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleSubmit();
                  }
                }}
              />
              <Button
                onClick={handleSubmit}
                disabled={!userAnswer.trim() || isSubmitting}
                size="icon"
                className="absolute bottom-3 right-3 h-10 w-10 rounded-xl gradient-bg hover:opacity-90 shadow-lg"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTimerEnabled(!timerEnabled)}
                className={cn(
                  "gap-2",
                  timerEnabled && "text-primary bg-primary/10"
                )}
              >
                <Timer className="w-4 h-4" />
                {timerEnabled ? "Timer: 30s" : "Enable Timer"}
              </Button>
              
              <p className="text-xs text-muted-foreground">
                Press Ctrl+Enter to submit
              </p>
            </div>
          </div>
        ) : (
          /* Result Display */
          <div className={cn(
            "rounded-xl p-6 space-y-4 animate-fade-in border-2",
            lastResult?.isCorrect 
              ? "bg-emerald-500/10 border-emerald-500/40" 
              : "bg-red-500/10 border-red-500/40"
          )}>
            <div className="flex items-center gap-4">
              {lastResult?.isCorrect ? (
                <>
                  <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-emerald-400">Correct! 🎉</h4>
                    <p className="text-sm text-muted-foreground">Excellent understanding!</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-red-400">Not Quite Right</h4>
                    <p className="text-sm text-muted-foreground">Let's learn from this</p>
                  </div>
                </>
              )}
            </div>

            {/* Explanation */}
            <div className="bg-background/60 rounded-xl p-5 border border-border/30">
              <h5 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {lastResult?.isCorrect ? "Additional Information:" : "Deep Explanation:"}
              </h5>
              <p className="text-muted-foreground leading-relaxed">
                {lastResult?.isCorrect 
                  ? lastResult.additionalInfo || lastResult.explanation
                  : lastResult?.explanation}
              </p>
            </div>

            {/* Actions */}
            {!lastResult?.isCorrect && (
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleTryAgain}
                  className="flex-1 gap-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                  variant="ghost"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </Button>
                {currentIndex < localQuestions.length - 1 && (
                  <Button
                    variant="ghost"
                    onClick={handleNext}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Skip to Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            )}

            {lastResult?.isCorrect && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Moving to next question...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
