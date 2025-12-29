import { Sparkles, GraduationCap, Code, Gamepad2, Search, HelpCircle, MessageCircle, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMode, MODE_INFO } from '@/types/chat';
import wiserLogo from '@/assets/wiser-ai-logo.png';
import { cn } from '@/lib/utils';

const quickPrompts = [
  { 
    icon: GraduationCap, 
    text: "Explain quantum computing", 
    subtext: "Get simple explanations",
    mode: 'study' as ChatMode 
  },
  { 
    icon: Code, 
    text: "Help me debug code", 
    subtext: "Fix bugs and optimize",
    mode: 'coding' as ChatMode 
  },
  { 
    icon: Gamepad2, 
    text: "Play a word game", 
    subtext: "Fun and educational",
    mode: 'game' as ChatMode 
  },
  { 
    icon: Search, 
    text: "Research a topic", 
    subtext: "Deep dive into subjects",
    mode: 'research' as ChatMode 
  },
];

const modeIconMap: Record<ChatMode, React.ComponentType<any>> = {
  conversation: MessageCircle,
  study: GraduationCap,
  quiz: HelpCircle,
  research: Search,
  game: Gamepad2,
  creative: Sparkles,
  coding: Code,
};

interface WelcomeScreenProps {
  onPromptClick: (prompt: string, mode: ChatMode) => void;
}

export function WelcomeScreen({ onPromptClick }: WelcomeScreenProps) {
  const { isAuthenticated, setShowAuthModal } = useAuth();

  const handlePromptClick = (prompt: string, mode: ChatMode) => {
    if (!isAuthenticated && mode !== 'conversation') {
      setShowAuthModal(true);
      return;
    }
    onPromptClick(prompt, mode);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-12 px-4 animate-fade-in">
      {/* Logo & Title */}
      <div className="relative mb-8">
        <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full scale-150" />
        <img 
          src={wiserLogo} 
          alt="Wiser AI" 
          className="relative h-24 w-24 object-contain"
        />
      </div>
      
      <h1 className="text-3xl md:text-4xl font-bold mb-3 text-center">
        Welcome to <span className="gradient-text">Wiser AI</span>
      </h1>
      
      <p className="text-muted-foreground text-center max-w-md mb-10">
        Your intelligent assistant for learning, coding, research, and more. Created in Tanzania by Tito Oscar Mwaisengela.
      </p>

      {/* Mode badges */}
      <div className="flex flex-wrap justify-center gap-2 mb-10 max-w-xl">
        {(Object.keys(MODE_INFO) as ChatMode[]).map((mode) => {
          const Icon = modeIconMap[mode];
          const isLocked = !isAuthenticated && mode !== 'conversation';
          
          return (
            <span
              key={mode}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border/50 bg-muted/30 transition-colors",
                MODE_INFO[mode].color,
                isLocked && "opacity-50"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {MODE_INFO[mode].label.replace(' Mode', '')}
              {isLocked && <Lock className="h-3 w-3" />}
            </span>
          );
        })}
      </div>

      {/* Quick prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
        {quickPrompts.map((prompt, index) => {
          const isLocked = !isAuthenticated && prompt.mode !== 'conversation';
          return (
            <Button
              key={index}
              variant="outline"
              className={cn(
                "h-auto p-4 justify-between gap-4 bg-muted/20 border-border/50 hover:border-primary/30 hover:bg-muted/40 transition-all group",
                isLocked && "opacity-70"
              )}
              onClick={() => handlePromptClick(prompt.text, prompt.mode)}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg transition-colors",
                  isLocked ? "bg-muted" : "bg-primary/10 group-hover:bg-primary/20"
                )}>
                  {isLocked ? (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <prompt.icon className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{prompt.text}</p>
                  <p className="text-xs text-muted-foreground">{prompt.subtext}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Button>
          );
        })}
      </div>

      {/* Sign in prompt for guests */}
      {!isAuthenticated && (
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Sign in to unlock all modes and save your conversations
          </p>
          <Button 
            variant="outline" 
            className="border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => setShowAuthModal(true)}
          >
            Sign In
          </Button>
        </div>
      )}
    </div>
  );
}
