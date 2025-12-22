export type ChatMode = 
  | 'conversation'
  | 'study'
  | 'quiz'
  | 'research'
  | 'game'
  | 'creative'
  | 'coding';

export type AIModel = 
  | 'gpt-3'
  | 'gpt-4'
  | 'gpt-5'
  | 'gpt-pro'
  | 'gemini'
  | 'grok';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mode?: ChatMode;
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
    color: 'text-primary',
  },
  study: {
    label: 'Study Mode',
    icon: 'GraduationCap',
    description: 'Simplified explanations & study plans',
    color: 'text-secondary',
  },
  quiz: {
    label: 'Quiz Mode',
    icon: 'HelpCircle',
    description: 'Interactive quizzes with scoring',
    color: 'text-gold',
  },
  research: {
    label: 'Research Mode',
    icon: 'Search',
    description: 'Deep searches with citations',
    color: 'text-accent',
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
  'gpt-3': { label: 'GPT-3', description: 'Fast & efficient' },
  'gpt-4': { label: 'GPT-4', description: 'Advanced reasoning' },
  'gpt-5': { label: 'GPT-5', description: 'Latest & most capable' },
  'gpt-pro': { label: 'GPT Pro', description: 'Professional grade' },
  'gemini': { label: 'Gemini', description: 'Google AI model' },
  'grok': { label: 'Grok', description: 'xAI model' },
};
