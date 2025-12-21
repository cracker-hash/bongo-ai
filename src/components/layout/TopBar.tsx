import { Menu, Search, Moon, Sun, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/contexts/ChatContext';
import { MODE_INFO } from '@/types/chat';
import { useState } from 'react';
import bongoLogo from '@/assets/bongo-ai-logo.png';

export function TopBar() {
  const { sidebarOpen, setSidebarOpen, currentMode } = useChat();
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('light', !isDark);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 glass-surface border-b border-border/50">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left section */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hover:bg-muted"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2 cursor-pointer group">
            <img 
              src={bongoLogo} 
              alt="Bongo AI" 
              className="h-10 w-10 rounded-lg object-contain animate-float"
            />
            <span className="font-display text-xl font-bold gradient-text hidden sm:block">
              Bongo AI
            </span>
          </div>
        </div>

        {/* Center section - Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              className="pl-10 bg-muted/50 border-border/50 focus:border-primary/50"
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Current mode badge */}
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 ${MODE_INFO[currentMode].color}`}>
            <span className="text-xs font-medium">{MODE_INFO[currentMode].label}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="hover:bg-muted"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted rounded-full overflow-hidden border-2 border-primary/30"
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
