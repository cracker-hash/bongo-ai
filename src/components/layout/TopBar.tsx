import { Menu, Search, Moon, Sun, User, LogOut, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { MODE_INFO } from '@/types/chat';
import { useState, useEffect } from 'react';
import bongoLogo from '@/assets/bongo-ai-logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopBar() {
  const { sidebarOpen, setSidebarOpen, currentMode } = useChat();
  const { user, isAuthenticated, logout, setShowAuthModal } = useAuth();
  const [isDark, setIsDark] = useState(true);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem('bongo_theme');
    if (stored) {
      const dark = stored === 'dark';
      setIsDark(dark);
      document.documentElement.classList.toggle('light', !dark);
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('light', !newIsDark);
    localStorage.setItem('bongo_theme', newIsDark ? 'dark' : 'light');
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
            className="hover:bg-muted lg:flex hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Mobile: always show menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hover:bg-muted lg:hidden"
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

        {/* Center section - Search (hidden on mobile, requires auth) */}
        {isAuthenticated && (
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                className="pl-10 bg-muted/50 border-border/50 focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        )}

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Current mode badge - hidden on mobile */}
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

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-muted rounded-full overflow-hidden border-2 border-primary/30"
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="font-medium text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={logout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAuthModal(true)}
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign In</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
