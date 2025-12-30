export type ChatMode = 
  | 'conversation'
  | 'study'
  | 'quiz'
  | 'research'
  | 'game'
  | 'creative'
  | 'coding';

export type AIModel = 
  | 'gemini-flash'
  | 'gemini-pro'
  | 'gpt-5'
  | 'gpt-5-mini';

export interface MessageImage {
  url: string;
  type: 'uploaded' | 'generated';
}

export interface DocumentAttachment {
  filename: string;
  content: string;
  type: 'pdf' | 'doc' | 'txt' | 'image';
  analysis?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  correctAnswer?: string;
  explanation?: string;
  hint?: string;
  userAnswer?: string;
  isCorrect?: boolean;
  attempts: number;
}

export interface QuizState {
  isActive: boolean;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  score: number;
  totalQuestions: number;
  documentContext?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mode?: ChatMode;
  images?: MessageImage[];
  document?: DocumentAttachment;
  quizData?: QuizQuestion;
}

export interface ChatProject {
  id: string;
  name: string;
  messages: Message[];
  mode: ChatMode;
  createdAt: Date;
  updatedAt: Date;
}

export const MODE_INFO: Record<ChatMode, { label: string; icon: string; description: string; color: string }> = {
  conversation: {
    label: 'Conversation',
    icon: 'MessageCircle',
    description: 'Casual, witty chats about anything',
    color: 'text-blue-400',
  },
  study: {
    label: 'Study Mode',
    icon: 'GraduationCap',
    description: 'Simplified explanations & study plans',
    color: 'text-emerald-400',
  },
  quiz: {
    label: 'Quiz Mode',
    icon: 'HelpCircle',
    description: 'Interactive quizzes with scoring',
    color: 'text-amber-400',
  },
  research: {
    label: 'Research Mode',
    icon: 'Search',
    description: 'Deep searches with citations',
    color: 'text-purple-400',
  },
  game: {
    label: 'Game Mode',
    icon: 'Gamepad2',
    description: 'Text-based games & puzzles',
    color: 'text-pink-400',
  },
  creative: {
    label: 'Creative Mode',
    icon: 'Sparkles',
    description: 'Writing, ideas & brainstorming',
    color: 'text-orange-400',
  },
  coding: {
    label: 'Coding Mode',
    icon: 'Code',
    description: 'Programming help & debugging',
    color: 'text-green-400',
  },
};

export const MODEL_INFO: Record<AIModel, { label: string; description: string }> = {
  'gemini-flash': { label: 'Gemini Flash', description: 'Fast & balanced' },
  'gemini-pro': { label: 'Gemini Pro', description: 'Most capable' },
  'gpt-5': { label: 'GPT-5', description: 'Advanced reasoning' },
  'gpt-5-mini': { label: 'GPT-5 Mini', description: 'Quick responses' },
};