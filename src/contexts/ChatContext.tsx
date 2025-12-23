import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { Message, ChatMode, AIModel } from '@/types/chat';
import { useChatStorage, StoredChat } from '@/hooks/useChatStorage';
import { useAuth } from '@/contexts/AuthContext';
import { streamChat } from '@/lib/streamChat';
import { toast } from 'sonner';

interface ChatContextType {
  messages: Message[];
  currentMode: ChatMode;
  currentModel: AIModel;
  chats: StoredChat[];
  currentChatId: string | null;
  sidebarOpen: boolean;
  isLoading: boolean;
  isLoadingChats: boolean;
  setCurrentMode: (mode: ChatMode) => void;
  setCurrentModel: (model: AIModel) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  setSidebarOpen: (open: boolean) => void;
  createNewChat: () => Promise<void>;
  selectChat: (id: string) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const getIsMobile = () => typeof window !== 'undefined' && window.innerWidth < 1024;

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMode, setCurrentMode] = useState<ChatMode>('conversation');
  const [currentModel, setCurrentModel] = useState<AIModel>('gemini-flash');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(!getIsMobile());
  const [isLoading, setIsLoading] = useState(false);
  const streamingMessageRef = useRef<string>('');

  const { user, isAuthenticated } = useAuth();
  const {
    chats,
    isLoadingChats,
    loadChats,
    createChat,
    loadMessages,
    saveMessage,
    deleteChat: deleteChatStorage,
  } = useChatStorage();

  // Only auto-close sidebar when transitioning TO mobile size
  useEffect(() => {
    let prevIsMobile = getIsMobile();
    const handleResize = () => {
      const nowMobile = getIsMobile();
      if (!prevIsMobile && nowMobile) {
        setSidebarOpen(false);
      }
      prevIsMobile = nowMobile;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Clear state when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setMessages([]);
      setCurrentChatId(null);
    }
  }, [isAuthenticated]);

  const createNewChat = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to save chats');
      return;
    }
    
    setMessages([]);
    setCurrentChatId(null);
    // Chat will be created when first message is sent
  }, [isAuthenticated]);

  const selectChat = useCallback(async (id: string) => {
    if (!isAuthenticated) return;
    
    setCurrentChatId(id);
    const loadedMessages = await loadMessages(id);
    setMessages(loadedMessages);
    
    // Set mode from chat
    const chat = chats.find(c => c.id === id);
    if (chat) {
      setCurrentMode(chat.mode);
    }
  }, [isAuthenticated, loadMessages, chats]);

  const deleteChat = useCallback(async (id: string) => {
    await deleteChatStorage(id);
    if (currentChatId === id) {
      setCurrentChatId(null);
      setMessages([]);
    }
  }, [deleteChatStorage, currentChatId]);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
      mode: currentMode,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    streamingMessageRef.current = '';

    let chatId = currentChatId;

    // Create chat if needed (for authenticated users)
    if (isAuthenticated && user && !chatId) {
      const chatName = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      chatId = await createChat(chatName, currentMode);
      if (chatId) {
        setCurrentChatId(chatId);
      }
    }

    // Save user message
    if (isAuthenticated && user && chatId) {
      await saveMessage(chatId, content, 'user', currentMode);
    }

    // Prepare messages for AI
    const aiMessages = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Create placeholder for assistant message
    const assistantMessageId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      mode: currentMode,
    }]);

    await streamChat({
      messages: aiMessages,
      mode: currentMode,
      onDelta: (chunk) => {
        streamingMessageRef.current += chunk;
        setMessages(prev => prev.map(m => 
          m.id === assistantMessageId 
            ? { ...m, content: streamingMessageRef.current }
            : m
        ));
      },
      onDone: async () => {
        setIsLoading(false);
        // Save assistant message
        if (isAuthenticated && user && chatId && streamingMessageRef.current) {
          await saveMessage(chatId, streamingMessageRef.current, 'assistant', currentMode);
          loadChats(); // Refresh chat list
        }
      },
      onError: (error) => {
        setIsLoading(false);
        toast.error(error);
        // Remove empty assistant message on error
        setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
      },
    });
  }, [currentMode, currentChatId, messages, isAuthenticated, user, createChat, saveMessage, loadChats]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentChatId(null);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        currentMode,
        currentModel,
        chats,
        currentChatId,
        sidebarOpen,
        isLoading,
        isLoadingChats,
        setCurrentMode,
        setCurrentModel,
        sendMessage,
        clearMessages,
        setSidebarOpen,
        createNewChat,
        selectChat,
        deleteChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
