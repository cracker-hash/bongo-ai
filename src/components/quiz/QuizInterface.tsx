import { useState } from 'react';
import { CheckCircle2, XCircle, Trophy, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizInterfaceProps {
  topic: string;
  onComplete: (score: number, total: number) => void;
}

// Sample quiz questions generator
const generateQuizQuestions = (topic: string): QuizQuestion[] => {
  // In production, this would come from an AI API
  const sampleQuestions: QuizQuestion[] = [
    {
      id: '1',
      question: `What is the most important aspect of ${topic}?`,
      options: ['Fundamental understanding', 'Memorization', 'Speed', 'Random guessing'],
      correctIndex: 0,
      explanation: 'Understanding the fundamentals is always the most important aspect of learning any topic.',
    },
    {
      id: '2',
      question: `Which approach works best when studying ${topic}?`,
      options: ['Cramming', 'Spaced repetition', 'Ignoring it', 'Only reading'],
      correctIndex: 1,
      explanation: 'Spaced repetition has been proven to be the most effective learning technique.',
    },
    {
      id: '3',
      question: 'What helps retain information better?',
      options: ['Passive reading', 'Active recall', 'Highlighting', 'Re-reading'],
      correctIndex: 1,
      explanation: 'Active recall forces your brain to retrieve information, strengthening memory pathways.',
    },
    {
      id: '4',
      question: 'How should you approach difficult concepts?',
      options: ['Skip them', 'Break them into smaller parts', 'Memorize without understanding', 'Give up'],
      correctIndex: 1,
      explanation: 'Breaking complex concepts into smaller, manageable parts makes learning easier.',
    },
    {
      id: '5',
      question: 'What is the best time to review material?',
      options: ['Right before sleeping', 'Never', 'Only during exams', 'Randomly'],
      correctIndex: 0,
      explanation: 'Reviewing before sleep helps consolidate memories during rest.',
    },
  ];
  
  return sampleQuestions;
};

export function QuizInterface({ topic, onComplete }: QuizInterfaceProps) {
  const [questions] = useState(() => generateQuizQuestions(topic));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  const currentQuestion = questions[currentIndex];

  const handleSelectAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    
    setShowResult(true);
    const newAnswers = [...answers, selectedAnswer];
    setAnswers(newAnswers);
    
    if (selectedAnswer === currentQuestion.correctIndex) {
      setScore(s => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsComplete(true);
      onComplete(score + (selectedAnswer === currentQuestion.correctIndex ? 1 : 0), questions.length);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsComplete(false);
    setAnswers([]);
  };

  if (isComplete) {
    const finalScore = score;
    const percentage = Math.round((finalScore / questions.length) * 100);
    
    return (
      <div className="bg-muted/30 rounded-2xl p-6 border border-border/50 text-center">
        <div className="mb-6">
          <Trophy className={cn(
            "h-16 w-16 mx-auto mb-4",
            percentage >= 80 ? "text-gold" : percentage >= 60 ? "text-secondary" : "text-muted-foreground"
          )} />
          <h3 className="font-display text-2xl font-bold mb-2">Quiz Complete!</h3>
          <p className="text-muted-foreground">Topic: {topic}</p>
        </div>

        <div className="bg-card/50 rounded-xl p-6 mb-6">
          <div className="text-5xl font-bold gradient-text mb-2">
            {finalScore}/{questions.length}
          </div>
          <p className="text-lg text-muted-foreground">
            {percentage}% correct
          </p>
          <div className="mt-4 h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full gradient-bg transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <p className="text-muted-foreground mb-6">
          {percentage >= 80 
            ? "🎉 Excellent work! You've mastered this topic!" 
            : percentage >= 60 
            ? "👍 Good job! Keep practicing to improve."
            : "📚 Keep studying! Practice makes perfect."}
        </p>

        <Button 
          onClick={handleRestart}
          className="gradient-bg hover:opacity-90 gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 rounded-2xl p-6 border border-border/50">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span className="text-sm font-medium text-primary">
          Score: {score}
        </span>
      </div>
      
      <div className="h-2 bg-muted rounded-full mb-6 overflow-hidden">
        <div 
          className="h-full gradient-bg transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <h3 className="font-display text-lg font-semibold mb-6">
        {currentQuestion.question}
      </h3>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {currentQuestion.options.map((option, index) => {
          const isCorrect = index === currentQuestion.correctIndex;
          const isSelected = selectedAnswer === index;
          
          return (
            <button
              key={index}
              onClick={() => handleSelectAnswer(index)}
              disabled={showResult}
              className={cn(
                "w-full text-left p-4 rounded-xl border transition-all",
                showResult
                  ? isCorrect
                    ? "bg-green-500/20 border-green-500/50 text-green-400"
                    : isSelected
                    ? "bg-red-500/20 border-red-500/50 text-red-400"
                    : "bg-muted/30 border-border/50 opacity-50"
                  : isSelected
                  ? "bg-primary/20 border-primary/50"
                  : "bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-border"
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-medium text-sm",
                  showResult && isCorrect 
                    ? "bg-green-500/30" 
                    : showResult && isSelected 
                    ? "bg-red-500/30"
                    : isSelected 
                    ? "bg-primary/30" 
                    : "bg-muted"
                )}>
                  {showResult && isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : showResult && isSelected ? (
                    <XCircle className="h-5 w-5 text-red-400" />
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </span>
                <span className="text-foreground">{option}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showResult && (
        <div className="bg-card/50 rounded-xl p-4 mb-6 border border-border/50">
          <div className="flex items-start gap-2">
            <Sparkles className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm mb-1">Explanation</p>
              <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {!showResult ? (
          <Button
            onClick={handleSubmitAnswer}
            disabled={selectedAnswer === null}
            className="gradient-bg hover:opacity-90"
          >
            Submit Answer
          </Button>
        ) : (
          <Button
            onClick={handleNextQuestion}
            className="gradient-bg hover:opacity-90"
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
          </Button>
        )}
      </div>
    </div>
  );
}
