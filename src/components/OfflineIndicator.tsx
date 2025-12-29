import { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isOnline, onOnlineStatusChange, getPendingMessages } from '@/lib/offlineStorage';

export function OfflineIndicator() {
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
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
      "fixed bottom-20 left-1/2 -translate-x-1/2 z-50",
      online ? "bg-primary/90 text-primary-foreground" : "bg-amber-500/90 text-amber-950",
      "px-4 py-2 rounded-full",
      "flex items-center gap-2 text-sm font-medium shadow-lg",
      "animate-in fade-in slide-in-from-bottom-4"
    )}>
      {online ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Syncing {pendingCount} message{pendingCount > 1 ? 's' : ''}...</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>
            Offline{pendingCount > 0 ? ` - ${pendingCount} pending` : ' - viewing cached content'}
          </span>
        </>
      )}
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
      "fixed bottom-20 left-1/2 -translate-x-1/2 z-50",
      "bg-green-500/90 text-green-950 px-4 py-2 rounded-full",
      "flex items-center gap-2 text-sm font-medium shadow-lg",
      "animate-in fade-in slide-in-from-bottom-4"
    )}>
      <Wifi className="h-4 w-4" />
      <span>Back online - syncing...</span>
    </div>
  );
}
