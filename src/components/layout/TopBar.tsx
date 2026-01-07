import { Menu, Moon, Sun, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import wiserLogo from '@/assets/wiser-ai-logo.png';
import { PodcastGeneratorDialog } from '@/components/podcast/PodcastGeneratorDialog';
import { NotificationsDropdown } from '@/components/layout/NotificationsDropdown';
import { ProfileDropdown } from '@/components/layout/ProfileDropdown';
import { CreditBalance } from '@/components/credits/CreditBalance';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Custom podcast icon
function PodcastIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
      stroke="currentColor" 
      strokeWidth="1.5"
    >
      <path d="M12 22c0 0 0-2 0-4" strokeLinecap="round" />
      <path d="M8 22h8" strokeLinecap="round" />
      <circle cx="12" cy="9" r="3" fill="currentColor" />
      <path d="M12 3c-3.866 0-7 3.134-7 7 0 2.209 1.021 4.177 2.618 5.464" strokeLinecap="round" />
      <path d="M12 3c3.866 0 7 3.134 7 7 0 2.209-1.021 4.177-2.618 5.464" strokeLinecap="round" />
      <path d="M12 6c-2.209 0-4 1.791-4 4 0 1.254.577 2.374 1.482 3.107" strokeLinecap="round" />
      <path d="M12 6c2.209 0 4 1.791 4 4 0 1.254-.577 2.374-1.482 3.107" strokeLinecap="round" />
    </svg>
  );
}

const wiserVersions = [
  { 
    id: 'max', 
    name: 'Wiser AI 2.0 Max', 
    description: 'High-performance agent for complex tasks',
    badge: 'Pro',
    badgeColor: 'bg-gradient-to-r from-cyan-400 to-blue-500',
    requiresPro: true
  },
  { 
    id: 'pro', 
    name: 'Wiser AI 2.0', 
    description: 'Versatile agent capable of most tasks',
    badge: 'Pro',
    badgeColor: 'bg-gradient-to-r from-cyan-400 to-blue-500',
    requiresPro: true
  },
  { 
    id: 'lite', 
    name: 'Wiser AI 2.0 Lite', 
    description: 'A lightweight agent for everyday tasks',
    badge: null,
    badgeColor: '',
    requiresPro: false
  },
];

export function TopBar() {
  const { sidebarOpen, setSidebarOpen } = useChat();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState('lite');
  const [showPodcastDialog, setShowPodcastDialog] = useState(false);

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

  const handleVersionSelect = (versionId: string) => {
    const version = wiserVersions.find(v => v.id === versionId);
    if (version?.requiresPro) {
      // Redirect to pricing page for Pro/Max versions
      navigate('/pricing');
    } else {
      setSelectedVersion(versionId);
    }
  };

  const currentVersion = wiserVersions.find(v => v.id === selectedVersion) || wiserVersions[2];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/95 backdrop-blur-xl border-b border-border">
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
                className="h-8 w-8 rounded-lg object-contain"
              />
            </div>

            {/* Version Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="h-9 px-3 gap-2 text-sm font-medium hover:bg-muted"
                >
                  {currentVersion.name}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 bg-card border-border">
                {wiserVersions.map((version) => (
                  <DropdownMenuItem
                    key={version.id}
                    onClick={() => handleVersionSelect(version.id)}
                    className="flex items-start gap-3 p-3 cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{version.name}</span>
                        {version.badge && (
                          <Badge className={`${version.badgeColor} text-white text-[10px] px-1.5 py-0 h-4`}>
                            {version.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {version.description}
                      </p>
                    </div>
                    {selectedVersion === version.id && (
                      <Check className="h-4 w-4 text-primary shrink-0 mt-1" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Podcast Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPodcastDialog(true)}
                  className="hover:bg-muted h-9 w-9 text-primary"
                >
                  <PodcastIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate Podcast</TooltipContent>
            </Tooltip>

            {/* Notifications */}
            {isAuthenticated && <NotificationsDropdown />}

            {/* Credits Balance */}
            {isAuthenticated && <CreditBalance compact />}

            {/* Theme Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hover:bg-muted h-9 w-9"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* Profile Dropdown */}
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <PodcastGeneratorDialog open={showPodcastDialog} onOpenChange={setShowPodcastDialog} />
    </>
  );
}
