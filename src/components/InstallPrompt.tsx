import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import wiserLogo from '@/assets/wiser-ai-logo.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
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

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a short delay
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('wiser_install_dismissed', Date.now().toString());
  };

  if (!showPrompt || dismissed || !deferredPrompt) return null;

  return (
    <div className={cn(
      "fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50",
      "bg-card border border-border rounded-2xl shadow-2xl p-4",
      "animate-in slide-in-from-bottom-4 fade-in duration-300"
    )}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <img 
            src={wiserLogo} 
            alt="Wiser AI" 
            className="w-14 h-14 rounded-xl"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">Install Wiser AI</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add to your home screen for quick access and offline support
          </p>
          
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              className="gradient-bg hover:opacity-90 gap-2"
              onClick={handleInstall}
            >
              <Download className="h-4 w-4" />
              Install Now
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="mt-4 pt-3 border-t border-border/50">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="text-xs">
            <div className="text-lg">⚡</div>
            <span className="text-muted-foreground">Faster</span>
          </div>
          <div className="text-xs">
            <div className="text-lg">📴</div>
            <span className="text-muted-foreground">Offline</span>
          </div>
          <div className="text-xs">
            <div className="text-lg">🔔</div>
            <span className="text-muted-foreground">Notifications</span>
          </div>
        </div>
      </div>
    </div>
  );
}
