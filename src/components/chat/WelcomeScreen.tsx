import { Sparkles, GraduationCap, Code, Gamepad2, Search, HelpCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/contexts/ChatContext';
import { ChatMode, MODE_INFO } from '@/types/chat';
import bongoLogo from '@/assets/bongo-ai-logo.png';

const quickPrompts = [
  { icon: GraduationCap, text: "Explain quantum computing simply", mode: 'study' as ChatMode },
  { icon: Code, text: "Help me debug my React code", mode: 'coding' as ChatMode },
  { icon: Gamepad2, text: "Let's play a word game!", mode: 'game' as ChatMode },
  { icon: Search, text: "Research climate change impacts in Africa", mode: 'research' as ChatMode },
];

interface WelcomeScreenProps {
  onPromptClick: (prompt: string, mode: ChatMode) => void;
}

export function WelcomeScreen({ onPromptClick }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-12 px-4 animate-fade-in">
      {/* Logo & Title */}
      <div className="relative mb-8">
        <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-primary/30 to-secondary/30 rounded-full" />
        <img 
          src={bongoLogo} 
          alt="Bongo AI" 
          className="relative h-32 w-32 object-contain animate-float"
        />
      </div>
      
      <h1 className="font-display text-4xl md:text-5xl font-bold mb-3 gradient-text text-center">
        Welcome to Bongo AI
      </h1>
      
      <p className="text-muted-foreground text-center max-w-md mb-2">
        Your helpful, witty, and fun AI assistant with an African tech flair.
      </p>
      
      <p className="text-sm text-muted-foreground text-center max-w-lg mb-8">
        I can help with research, studying, quizzes, games, coding, and creative projects. 
        Switch between modes anytime!
      </p>

      {/* Mode badges */}
      <div className="flex flex-wrap justify-center gap-2 mb-10 max-w-lg">
        {(Object.keys(MODE_INFO) as ChatMode[]).map((mode) => (
          <span
            key={mode}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs border border-border/50 bg-muted/30 ${MODE_INFO[mode].color}`}
          >
            {mode === 'conversation' && <MessageCircle className="h-3 w-3" />}
            {mode === 'study' && <GraduationCap className="h-3 w-3" />}
            {mode === 'quiz' && <HelpCircle className="h-3 w-3" />}
            {mode === 'research' && <Search className="h-3 w-3" />}
            {mode === 'game' && <Gamepad2 className="h-3 w-3" />}
            {mode === 'creative' && <Sparkles className="h-3 w-3" />}
            {mode === 'coding' && <Code className="h-3 w-3" />}
            {MODE_INFO[mode].label.replace(' Mode', '')}
          </span>
        ))}
      </div>

      {/* Quick prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
        {quickPrompts.map((prompt, index) => (
          <Button
            key={index}
            variant="outline"
            className="h-auto p-4 justify-start gap-3 bg-muted/30 border-border/50 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all group"
            onClick={() => onPromptClick(prompt.text, prompt.mode)}
          >
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <prompt.icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm text-left">{prompt.text}</span>
          </Button>
        ))}
      </div>

      {/* Creator info */}
      <div className="mt-12 text-center">
        <p className="text-xs text-muted-foreground">
          Created by <span className="gold-accent font-medium">Tito Oscar Mwaisengela</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          University of Dar es Salaam, Tanzania 🇹🇿
        </p>
      </div>
    </div>
  );
}
