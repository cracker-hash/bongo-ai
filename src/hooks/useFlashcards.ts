import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Flashcard {
  id: string;
  user_id: string;
  deck: string;
  front: string;
  back: string;
  ease_factor: number;
  interval_days: number;
  next_review_at: string;
  review_count: number;
  created_at: string;
}

type Difficulty = 'again' | 'hard' | 'good' | 'easy';

function computeSM2(card: Flashcard, difficulty: Difficulty) {
  let ef = card.ease_factor;
  let interval = card.interval_days;
  let reviewCount = card.review_count + 1;

  const qualityMap: Record<Difficulty, number> = { again: 0, hard: 2, good: 4, easy: 5 };
  const q = qualityMap[difficulty];

  ef = Math.max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  if (q < 3) {
    interval = 1;
  } else if (reviewCount === 1) {
    interval = 1;
  } else if (reviewCount === 2) {
    interval = 6;
  } else {
    interval = Math.round(interval * ef);
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return { ease_factor: ef, interval_days: interval, next_review_at: nextReview.toISOString(), review_count: reviewCount };
}

export function useFlashcards() {
  const { user, isAuthenticated } = useAuth();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [decks, setDecks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadFlashcards = useCallback(async (deck?: string) => {
    if (!isAuthenticated || !user) return;
    setIsLoading(true);
    try {
      let query = supabase.from('flashcards').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (deck) query = query.eq('deck', deck);
      const { data, error } = await query;
      if (error) throw error;
      setFlashcards((data as unknown as Flashcard[]) || []);
      
      const now = new Date().toISOString();
      setDueCards(((data as unknown as Flashcard[]) || []).filter(c => c.next_review_at <= now));
      
      const uniqueDecks = [...new Set(((data as unknown as Flashcard[]) || []).map(c => c.deck))];
      setDecks(uniqueDecks);
    } catch (err) {
      console.error('Failed to load flashcards:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const createFlashcards = useCallback(async (cards: { front: string; back: string; deck?: string }[]) => {
    if (!isAuthenticated || !user) return;
    try {
      const rows = cards.map(c => ({ user_id: user.id, front: c.front, back: c.back, deck: c.deck || 'General' }));
      const { error } = await supabase.from('flashcards').insert(rows);
      if (error) throw error;
      toast.success(`${cards.length} flashcard(s) created!`);
      await loadFlashcards();
    } catch (err) {
      toast.error('Failed to create flashcards');
    }
  }, [isAuthenticated, user, loadFlashcards]);

  const reviewCard = useCallback(async (cardId: string, difficulty: Difficulty) => {
    const card = flashcards.find(c => c.id === cardId);
    if (!card) return;
    
    const updates = computeSM2(card, difficulty);
    const { error } = await supabase.from('flashcards').update(updates).eq('id', cardId);
    if (error) {
      toast.error('Failed to save review');
      return;
    }
    await loadFlashcards();
  }, [flashcards, loadFlashcards]);

  const deleteCard = useCallback(async (cardId: string) => {
    const { error } = await supabase.from('flashcards').delete().eq('id', cardId);
    if (error) toast.error('Failed to delete');
    else await loadFlashcards();
  }, [loadFlashcards]);

  useEffect(() => { loadFlashcards(); }, [loadFlashcards]);

  return { flashcards, dueCards, decks, isLoading, loadFlashcards, createFlashcards, reviewCard, deleteCard };
}
