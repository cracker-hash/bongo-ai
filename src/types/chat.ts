export type ChatMode = 
  | 'conversation'
  | 'study'
  | 'quiz'
  | 'research'
  | 'game'
  | 'creative'
  | 'coding';

export type AIModel = 
  | 'gpt-4o-mini'
  | 'gpt-4o'
  | 'gpt-4-turbo'
  | 'claude-3.5-sonnet'
  | 'claude-3-opus'
  | 'gemini-2.0-flash'
  | 'gemini-1.5-pro'
  | 'llama-3.3-70b'
  | 'deepseek-r1';

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

export const MODEL_INFO: Record<AIModel, { label: string; description: string; openrouterId: string }> = {
  'gpt-4o-mini': { label: 'GPT-4o Mini', description: 'Fast & affordable', openrouterId: 'openai/gpt-4o-mini' },
  'gpt-4o': { label: 'GPT-4o', description: 'Most capable OpenAI', openrouterId: 'openai/gpt-4o' },
  'gpt-4-turbo': { label: 'GPT-4 Turbo', description: 'Advanced reasoning', openrouterId: 'openai/gpt-4-turbo' },
  'claude-3.5-sonnet': { label: 'Claude 3.5 Sonnet', description: 'Best for coding', openrouterId: 'anthropic/claude-3.5-sonnet' },
  'claude-3-opus': { label: 'Claude 3 Opus', description: 'Most intelligent', openrouterId: 'anthropic/claude-3-opus' },
  'gemini-2.0-flash': { label: 'Gemini 2.0 Flash', description: 'Fast & balanced', openrouterId: 'google/gemini-2.0-flash-001' },
  'gemini-1.5-pro': { label: 'Gemini 1.5 Pro', description: 'Long context', openrouterId: 'google/gemini-pro-1.5' },
  'llama-3.3-70b': { label: 'Llama 3.3 70B', description: 'Open source', openrouterId: 'meta-llama/llama-3.3-70b-instruct' },
  'deepseek-r1': { label: 'DeepSeek R1', description: 'Reasoning model', openrouterId: 'deepseek/deepseek-r1' },
};