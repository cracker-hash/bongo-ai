// IndexedDB wrapper for offline chat storage
import { Message } from '@/types/chat';

const DB_NAME = 'wiser-ai-db';
const DB_VERSION = 1;
const CHATS_STORE = 'chats';
const MESSAGES_STORE = 'messages';
const PENDING_STORE = 'pending_messages';

let db: IDBDatabase | null = null;

export interface OfflineChat {
  id: string;
  name: string;
  mode: string;
  projectId?: string;
  updatedAt: string;
  isPinned?: boolean;
  isArchived?: boolean;
}

export interface OfflineMessage {
  id: string;
  chatId: string;
  content: string;
  role: 'user' | 'assistant';
  mode?: string;
  createdAt: string;
  pending?: boolean;
}

async function openDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Chats store
      if (!database.objectStoreNames.contains(CHATS_STORE)) {
        const chatsStore = database.createObjectStore(CHATS_STORE, { keyPath: 'id' });
        chatsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Messages store
      if (!database.objectStoreNames.contains(MESSAGES_STORE)) {
        const messagesStore = database.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
        messagesStore.createIndex('chatId', 'chatId', { unique: false });
        messagesStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Pending messages store (for offline sync)
      if (!database.objectStoreNames.contains(PENDING_STORE)) {
        database.createObjectStore(PENDING_STORE, { keyPath: 'id' });
      }
    };
  });
}

// Chat operations
export async function saveChat(chat: OfflineChat): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(CHATS_STORE, 'readwrite');
    const store = tx.objectStore(CHATS_STORE);
    const request = store.put(chat);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getChats(): Promise<OfflineChat[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(CHATS_STORE, 'readonly');
    const store = tx.objectStore(CHATS_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const chats = request.result || [];
      chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      resolve(chats);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteChat(chatId: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([CHATS_STORE, MESSAGES_STORE], 'readwrite');
    
    // Delete chat
    tx.objectStore(CHATS_STORE).delete(chatId);
    
    // Delete messages
    const messagesStore = tx.objectStore(MESSAGES_STORE);
    const index = messagesStore.index('chatId');
    const request = index.openCursor(IDBKeyRange.only(chatId));
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Message operations
export async function saveMessage(message: OfflineMessage): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(MESSAGES_STORE, 'readwrite');
    const store = tx.objectStore(MESSAGES_STORE);
    const request = store.put(message);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getMessages(chatId: string): Promise<OfflineMessage[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(MESSAGES_STORE, 'readonly');
    const store = tx.objectStore(MESSAGES_STORE);
    const index = store.index('chatId');
    const request = index.getAll(chatId);
    request.onsuccess = () => {
      const messages = request.result || [];
      messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      resolve(messages);
    };
    request.onerror = () => reject(request.error);
  });
}

// Pending messages for offline sync
export async function savePendingMessage(message: OfflineMessage): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(PENDING_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_STORE);
    const request = store.put({ ...message, pending: true });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingMessages(): Promise<OfflineMessage[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(PENDING_STORE, 'readonly');
    const store = tx.objectStore(PENDING_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function removePendingMessage(messageId: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(PENDING_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_STORE);
    const request = store.delete(messageId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Bulk sync from server
export async function syncChatsFromServer(chats: OfflineChat[]): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(CHATS_STORE, 'readwrite');
    const store = tx.objectStore(CHATS_STORE);
    chats.forEach(chat => store.put(chat));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function syncMessagesFromServer(chatId: string, messages: OfflineMessage[]): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(MESSAGES_STORE, 'readwrite');
    const store = tx.objectStore(MESSAGES_STORE);
    messages.forEach(msg => store.put({ ...msg, chatId }));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Check online status
export function isOnline(): boolean {
  return navigator.onLine;
}

// Listen for online/offline events
export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
