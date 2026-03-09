import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RotateCcw, ChevronLeft, ChevronRight, Layers, Trophy } from 'lucide-react';
import { useFlashcards, Flashcard } from '@/hooks/useFlashcards';
import { cn } from '@/lib/utils';

interface FlashcardReviewProps {
  deck?: string;
  onComplete?: (reviewed: number) => void;
}

export function FlashcardReview({ deck, onComplete }: FlashcardReviewProps) {
  const { dueCards, flashcards, reviewCard, isLoading } = useFlashcards();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

  const cards = deck ? dueCards.filter(c => c.deck === deck) : dueCards;
  const currentCard = cards[currentIndex];

  const handleDifficulty = useCallback(async (difficulty: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentCard) return;
    await reviewCard(currentCard.id, difficulty);
    setIsFlipped(false);
    setReviewed(prev => prev + 1);

    if (currentIndex + 1 >= cards.length) {
      setSessionComplete(true);
      onComplete?.(reviewed + 1);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentCard, currentIndex, cards.length, reviewCard, reviewed, onComplete]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <Trophy className="h-12 w-12 text-amber-400" />
        <h3 className="text-lg font-semibold">No cards due for review!</h3>
        <p className="text-muted-foreground text-sm">
          {flashcards.length === 0 
            ? 'Create flashcards by saying "create flashcards on [topic]" in chat.'
            : 'All caught up! Come back later for more reviews.'}
        </p>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <Trophy className="h-12 w-12 text-amber-400" />
        <h3 className="text-lg font-semibold">Session Complete!</h3>
        <p className="text-muted-foreground">You reviewed {reviewed} card{reviewed !== 1 ? 's' : ''}.</p>
        <Button onClick={() => { setSessionComplete(false); setCurrentIndex(0); setReviewed(0); }}>
          <RotateCcw className="h-4 w-4 mr-2" /> Review Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto py-4">
      {/* Progress */}
      <div className="w-full flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{currentIndex + 1}/{cards.length}</span>
        <Progress value={((currentIndex) / cards.length) * 100} className="flex-1" />
        <Badge variant="outline" className="text-xs">
          <Layers className="h-3 w-3 mr-1" /> {currentCard?.deck}
        </Badge>
      </div>

      {/* Card */}
      <div
        className="w-full perspective-1000 cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={cn(
          "relative w-full min-h-[250px] transition-transform duration-500 preserve-3d",
          isFlipped && "rotate-y-180"
        )}>
          {/* Front */}
          <Card className={cn(
            "absolute inset-0 backface-hidden flex items-center justify-center p-8",
            "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
          )}>
            <CardContent className="text-center p-0">
              <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Question</p>
              <p className="text-lg font-medium">{currentCard?.front}</p>
            </CardContent>
          </Card>

          {/* Back */}
          <Card className={cn(
            "absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center p-8",
            "bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20"
          )}>
            <CardContent className="text-center p-0">
              <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Answer</p>
              <p className="text-lg font-medium">{currentCard?.back}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">Tap card to flip</p>

      {/* Difficulty buttons - show only when flipped */}
      {isFlipped && (
        <div className="flex gap-2 w-full animate-fade-in">
          <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDifficulty('again')}>
            Again
          </Button>
          <Button variant="outline" size="sm" className="flex-1 border-orange-500/50 text-orange-500 hover:bg-orange-500/10" onClick={() => handleDifficulty('hard')}>
            Hard
          </Button>
          <Button variant="outline" size="sm" className="flex-1 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleDifficulty('good')}>
            Good
          </Button>
          <Button variant="outline" size="sm" className="flex-1 border-blue-500/50 text-blue-500 hover:bg-blue-500/10" onClick={() => handleDifficulty('easy')}>
            Easy
          </Button>
        </div>
      )}
    </div>
  );
}
