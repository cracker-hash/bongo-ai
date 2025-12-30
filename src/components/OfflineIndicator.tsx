import { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isOnline, onOnlineStatusChange, getPendingMessages } from '@/lib/offlineStorage';
import wiserLogo from '@/assets/wiser-ai-logo.png';

export function OfflineIndicator() {
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if installed as PWA
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);
    
    const unsubscribe = onOnlineStatusChange(setOnline);
    
    // Check for pending messages
    const checkPending = async () => {
      try {
        const pending = await getPendingMessages();
        setPendingCount(pending.length);
      } catch {}
    };
    
    checkPending();
    const interval = setInterval(checkPending, 5000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (online && pendingCount === 0) return null;

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50",
      "animate-in fade-in slide-in-from-top-2 duration-300"
    )}>
      <div className={cn(
        online ? "bg-primary/95" : "bg-gradient-to-r from-amber-600 to-orange-600",
        "text-white px-4 py-2.5",
        "flex items-center justify-center gap-3 text-sm font-medium shadow-lg"
      )}>
        {online ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Syncing {pendingCount} message{pendingCount > 1 ? 's' : ''}...</span>
          </>
        ) : (
          <>
            <Plane className="h-4 w-4" />
            <div className="flex items-center gap-2">
              <img src={wiserLogo} alt="" className="h-5 w-5 rounded" />
              <span>
                {isInstalled 
                  ? "You're offline — all your chats are here. Welcome back!"
                  : `Offline Mode${pendingCount > 0 ? ` — ${pendingCount} pending` : ' — viewing cached content'}`
                }
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function OnlineIndicator() {
  const [showOnline, setShowOnline] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const unsubscribe = onOnlineStatusChange((online) => {
      if (online) {
        setShowOnline(true);
        timeout = setTimeout(() => setShowOnline(false), 3000);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (!showOnline) return null;

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50",
      "animate-in fade-in slide-in-from-top-2 duration-300"
    )}>
      <div className={cn(
        "bg-gradient-to-r from-green-600 to-emerald-600 text-white",
        "px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium shadow-lg"
      )}>
        <Wifi className="h-4 w-4" />
        <span>Back online — syncing your data...</span>
      </div>
    </div>
  );
}
