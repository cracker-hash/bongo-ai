import { Menu, Moon, Sun, Bell, Sparkles, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import wiserLogo from '@/assets/wiser-ai-logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const wiserVersions = [
  { 
    id: 'max', 
    name: 'Wiser AI 2.0 Max', 
    description: 'High-performance agent for complex tasks',
    badge: 'Pro',
    badgeColor: 'bg-gradient-to-r from-cyan-400 to-blue-500'
  },
  { 
    id: 'pro', 
    name: 'Wiser AI 2.0', 
    description: 'Versatile agent capable of most tasks',
    badge: 'Pro',
    badgeColor: 'bg-gradient-to-r from-cyan-400 to-blue-500'
  },
  { 
    id: 'lite', 
    name: 'Wiser AI 2.0 Lite', 
    description: 'A lightweight agent for everyday tasks',
    badge: null,
    badgeColor: ''
  },
];

export function TopBar() {
  const { sidebarOpen, setSidebarOpen } = useChat();
  const { user, isAuthenticated } = useAuth();
  const [isDark, setIsDark] = useState(true);
  
  const [selectedVersion, setSelectedVersion] = useState('lite');

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
                    onClick={() => setSelectedVersion(version.id)}
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
            {/* Notification Bell */}
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-muted h-9 w-9"
            >
              <Bell className="h-5 w-5" />
            </Button>

            {/* Credits */}
            <Button
              variant="ghost"
              className="h-9 px-3 gap-2 hover:bg-muted"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm">0</span>
            </Button>

            {/* Theme Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hover:bg-muted h-9 w-9"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* User Avatar */}
            {isAuthenticated && user && (
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={(user as any).user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white text-xs">
                  {user.email?.charAt(0).toUpperCase() || 'W'}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
