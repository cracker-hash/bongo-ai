import { useEffect, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPendingMessages,
  removePendingMessage,
  savePendingMessage,
  isOnline,
  onOnlineStatusChange,
  OfflineMessage
} from '@/lib/offlineStorage';

export function useOfflineSync() {
  const { isAuthenticated, user } = useAuth();
  const syncInProgressRef = useRef(false);

  // Sync pending messages when online
  const syncPendingMessages = useCallback(async () => {
    if (!isAuthenticated || !user || syncInProgressRef.current) return;
    
    syncInProgressRef.current = true;
    
    try {
      const pendingMessages = await getPendingMessages();
      
      if (pendingMessages.length === 0) {
        syncInProgressRef.current = false;
        return;
      }

      let syncedCount = 0;
      
      for (const message of pendingMessages) {
        try {
          // Save to Supabase
          const { error } = await supabase
            .from('messages')
            .insert({
              id: message.id,
              chat_id: message.chatId,
              content: message.content,
              role: message.role,
              mode: message.mode,
              user_id: user.id,
              created_at: message.createdAt
            });

          if (!error) {
            await removePendingMessage(message.id);
            syncedCount++;
          }
        } catch (err) {
          console.error('Failed to sync message:', message.id, err);
        }
      }

      if (syncedCount > 0) {
        toast({
          title: "Messages Synced",
          description: `${syncedCount} offline message${syncedCount > 1 ? 's' : ''} synced successfully`
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      syncInProgressRef.current = false;
    }
  }, [isAuthenticated, user]);

  // Queue message for offline sync
  const queueOfflineMessage = useCallback(async (
    chatId: string,
    content: string,
    role: 'user' | 'assistant',
    mode?: string
  ): Promise<string> => {
    const messageId = crypto.randomUUID();
    
    const offlineMessage: OfflineMessage = {
      id: messageId,
      chatId,
      content,
      role,
      mode,
      createdAt: new Date().toISOString(),
      pending: true
    };

    await savePendingMessage(offlineMessage);
    
    return messageId;
  }, []);

  // Listen for online/offline status
  useEffect(() => {
    const unsubscribe = onOnlineStatusChange((online) => {
      if (online && isAuthenticated) {
        // Delay sync slightly to ensure connection is stable
        setTimeout(syncPendingMessages, 1000);
      }
    });

    // Also sync on mount if online
    if (isOnline() && isAuthenticated) {
      syncPendingMessages();
    }

    // Listen for service worker sync events
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_MESSAGES') {
          syncPendingMessages();
        }
      });
    }

    return unsubscribe;
  }, [isAuthenticated, syncPendingMessages]);

  // Register background sync
  useEffect(() => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        // Request background sync permission
        (registration as any).sync?.register('sync-messages').catch(() => {
          // Background sync not supported, rely on online event
        });
      });
    }
  }, []);

  return {
    syncPendingMessages,
    queueOfflineMessage,
    isOnline: isOnline()
  };
}
