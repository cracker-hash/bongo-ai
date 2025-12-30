import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, Apple } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import wiserLogo from '@/assets/wiser-ai-logo.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'android' | 'ios' | 'desktop' | 'unknown';

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows|mac|linux/.test(ua)) return 'desktop';
  return 'unknown';
}

const INSTALL_INSTRUCTIONS: Record<Platform, { icon: React.ReactNode; steps: string[] }> = {
  android: {
    icon: <Smartphone className="h-5 w-5" />,
    steps: [
      "Tap the three dots (⋮) menu",
      "Select 'Add to Home screen'",
      "Tap 'Add' to install WISER AI"
    ]
  },
  ios: {
    icon: <Apple className="h-5 w-5" />,
    steps: [
      "Tap the Share button (↑)",
      "Scroll and tap 'Add to Home Screen'",
      "Tap 'Add' to install WISER AI"
    ]
  },
  desktop: {
    icon: <Monitor className="h-5 w-5" />,
    steps: [
      "Click the install icon in the address bar",
      "Or use menu → 'Install WISER AI'",
      "Click 'Install' to add to desktop"
    ]
  },
  unknown: {
    icon: <Download className="h-5 w-5" />,
    steps: ["Use your browser menu to add to home screen"]
  }
};

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    
    // Check if already installed
    const installed = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(installed);
    if (installed) return;

    // Check if already dismissed
    const wasDismissed = localStorage.getItem('wiser_install_dismissed');
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a short delay
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // For iOS/Safari - show manual instructions after delay
    if (detectPlatform() === 'ios') {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('wiser_install_dismissed', Date.now().toString());
  };

  if (!showPrompt || dismissed || isInstalled) return null;

  const instructions = INSTALL_INSTRUCTIONS[platform];
  const canAutoInstall = !!deferredPrompt;

  return (
    <div className={cn(
      "fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[420px] z-50",
      "bg-gradient-to-br from-card to-card/95 border border-primary/20 rounded-2xl shadow-2xl p-5",
      "animate-in slide-in-from-bottom-4 fade-in duration-300",
      "backdrop-blur-xl"
    )}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex items-start gap-4">
        <div className="shrink-0 relative">
          <img 
            src={wiserLogo} 
            alt="Wiser AI" 
            className="w-16 h-16 rounded-2xl shadow-lg"
          />
          <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
            {instructions.icon}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-foreground">Install WISER AI</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Unlock <span className="text-primary font-medium">full offline access</span> to all your chats!
          </p>
        </div>
      </div>

      {/* Platform-specific instructions */}
      {!canAutoInstall && (
        <div className="mt-4 p-3 bg-sidebar-accent/50 rounded-xl">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
            {instructions.icon}
            <span>How to install:</span>
          </p>
          <ol className="text-sm space-y-1.5">
            {instructions.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <span className="text-foreground/80">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      
      <div className="flex items-center gap-2 mt-4">
        {canAutoInstall ? (
          <Button
            className="flex-1 gradient-bg hover:opacity-90 gap-2 h-11 font-semibold"
            onClick={handleInstall}
          >
            <Download className="h-4 w-4" />
            Install Now
          </Button>
        ) : (
          <Button
            className="flex-1 gradient-bg hover:opacity-90 gap-2 h-11 font-semibold"
            onClick={handleDismiss}
          >
            Got It!
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-11"
        >
          Later
        </Button>
      </div>

      {/* Benefits */}
      <div className="mt-4 pt-4 border-t border-border/30">
        <p className="text-xs text-center text-muted-foreground mb-3">
          The WISER advantage — your data, always with you
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 rounded-lg bg-sidebar-accent/30">
            <div className="text-xl mb-1">📴</div>
            <span className="text-xs text-muted-foreground">Full Offline</span>
          </div>
          <div className="p-2 rounded-lg bg-sidebar-accent/30">
            <div className="text-xl mb-1">⚡</div>
            <span className="text-xs text-muted-foreground">Instant Load</span>
          </div>
          <div className="p-2 rounded-lg bg-sidebar-accent/30">
            <div className="text-xl mb-1">🔒</div>
            <span className="text-xs text-muted-foreground">Your Device</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to check if app is installed
export function useIsInstalled() {
  const [isInstalled, setIsInstalled] = useState(false);
  
  useEffect(() => {
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);
    
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handler = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  return isInstalled;
}
