import { Menu, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/contexts/ChatContext';
import { useState, useEffect } from 'react';
import { PodcastGeneratorDialog } from '@/components/podcast/PodcastGeneratorDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import wiserLogo from '@/assets/wiser-logo.png';

// Podcast icon component
function PodcastIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
      stroke="currentColor" 
      strokeWidth="1.5"
    >
      <path d="M12 22c0 0 0-2 0-4" strokeLinecap="round"/>
      <path d="M8 22h8" strokeLinecap="round"/>
      <circle cx="12" cy="9" r="3" fill="currentColor" />
      <path d="M12 3c-3.866 0-7 3.134-7 7 0 2.209 1.021 4.177 2.618 5.464" strokeLinecap="round"/>
      <path d="M12 3c3.866 0 7 3.134 7 7 0 2.209-1.021 4.177-2.618 5.464" strokeLinecap="round"/>
      <path d="M12 6c-2.209 0-4 1.791-4 4 0 1.254.577 2.374 1.482 3.107" strokeLinecap="round"/>
      <path d="M12 6c2.209 0 4 1.791 4 4 0 1.254-.577 2.374-1.482 3.107" strokeLinecap="round"/>
    </svg>
  );
}

export function TopBar() {
  const { sidebarOpen, setSidebarOpen } = useChat();
  const [isDark, setIsDark] = useState(true);
  const [showPodcast, setShowPodcast] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem('wiser_theme');
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
    localStorage.setItem('wiser_theme', newIsDark ? 'dark' : 'light');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-full px-4">
          {/* Left section */}
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="hover:bg-muted hidden lg:flex"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            
            <div className="flex items-center gap-2">
              <img 
                src={wiserLogo} 
                alt="Wiser AI" 
                className="h-9 w-9 rounded-lg object-contain"
              />
              <span className="font-semibold text-lg hidden sm:block">
                Wiser AI
              </span>
            </div>
          </div>

          {/* Right section - Podcast button and Theme toggle separated */}
          <div className="flex items-center gap-3">
            {/* Podcast Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setShowPodcast(true)}
                  size="icon"
                  className="h-10 w-10 rounded-full shadow-lg 
                             bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-600
                             hover:from-cyan-500 hover:via-blue-600 hover:to-blue-700
                             text-white border-0
                             relative overflow-hidden
                             before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_center,rgba(0,191,255,0.4),transparent_70%)] before:animate-pulse"
                >
                  <PodcastIcon className="h-5 w-5 relative z-10" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-card border-border">
                <p>Generate Podcast</p>
              </TooltipContent>
            </Tooltip>

            {/* Theme Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hover:bg-muted h-10 w-10"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <PodcastGeneratorDialog open={showPodcast} onOpenChange={setShowPodcast} />
    </>
  );
}