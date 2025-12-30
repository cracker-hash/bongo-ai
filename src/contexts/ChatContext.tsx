import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { Message, ChatMode, AIModel, MessageImage, DocumentAttachment } from '@/types/chat';
import { useChatStorage, StoredChat } from '@/hooks/useChatStorage';
import { useAuth } from '@/contexts/AuthContext';
import { streamChat, generateImage } from '@/lib/streamChat';
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
  sendMessage: (content: string, images?: string[], document?: DocumentAttachment) => Promise<void>;
  addAssistantMessage: (content: string) => void;
  clearMessages: () => void;
  setSidebarOpen: (open: boolean) => void;
  createNewChat: () => Promise<void>;
  createChatForProject: (projectId: string, projectName: string) => Promise<string | null>;
  selectChat: (id: string) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  renameChat: (id: string, name: string) => Promise<void>;
  pinChat: (id: string, pinned: boolean) => Promise<void>;
  archiveChat: (id: string, archived: boolean) => Promise<void>;
  moveChatToProject: (id: string, projectId: string | null) => Promise<void>;
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
    updateChatName,
    pinChat: pinChatStorage,
    archiveChat: archiveChatStorage,
    moveChatToProject: moveChatToProjectStorage,
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

  const createChatForProject = useCallback(async (projectId: string, projectName: string): Promise<string | null> => {
    if (!isAuthenticated) {
      toast.error('Please sign in to save chats');
      return null;
    }
    
    // Create a new chat directly linked to the project
    const chatId = await createChat(projectName, currentMode, projectId);
    if (chatId) {
      setCurrentChatId(chatId);
      setMessages([]);
      return chatId;
    }
    return null;
  }, [isAuthenticated, createChat, currentMode]);

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

  const renameChat = useCallback(async (id: string, name: string) => {
    await updateChatName(id, name);
  }, [updateChatName]);

  const pinChat = useCallback(async (id: string, pinned: boolean) => {
    await pinChatStorage(id, pinned);
  }, [pinChatStorage]);

  const archiveChat = useCallback(async (id: string, archived: boolean) => {
    await archiveChatStorage(id, archived);
  }, [archiveChatStorage]);

  const moveChatToProject = useCallback(async (id: string, projectId: string | null) => {
    await moveChatToProjectStorage(id, projectId);
  }, [moveChatToProjectStorage]);

  const sendMessage = useCallback(async (content: string, images?: string[], document?: DocumentAttachment) => {
    // Check if this is an image generation request
    const isImageGenRequest = content.toLowerCase().startsWith('generate an image:') || 
                              content.toLowerCase().startsWith('create an image:') ||
                              content.toLowerCase().startsWith('draw ') ||
                              content.toLowerCase().includes('generate an image of');

    const userImages: MessageImage[] = images?.map(url => ({ url, type: 'uploaded' as const })) || [];
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
      mode: currentMode,
      images: userImages.length > 0 ? userImages : undefined,
      document: document || undefined,
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

    // Handle image generation
    if (isImageGenRequest) {
      const imagePrompt = content
        .replace(/^(generate an image:|create an image:|draw )/i, '')
        .replace(/generate an image of/i, '')
        .trim();

      try {
        const result = await generateImage(imagePrompt);
        
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.textResponse || "Here's your generated image!",
          timestamp: new Date(),
          mode: currentMode,
          images: result.generatedImage ? [{ url: result.generatedImage, type: 'generated' }] : undefined,
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        if (isAuthenticated && user && chatId) {
          await saveMessage(chatId, assistantMessage.content, 'assistant', currentMode);
          loadChats();
        }
      } catch (error) {
        toast.error('Failed to generate image');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Prepare messages for AI (including images)
    const aiMessages = [...messages, userMessage].map(m => {
      if (m.images && m.images.length > 0) {
        // Format for vision model
        return {
          role: m.role,
          content: [
            { type: 'text', text: m.content },
            ...m.images.map(img => ({
              type: 'image_url',
              image_url: { url: img.url }
            }))
          ]
        };
      }
      return {
        role: m.role,
        content: m.content,
      };
    });

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

  // Add assistant message directly (for document processing responses)
  const addAssistantMessage = useCallback((content: string) => {
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      mode: currentMode,
    };
    setMessages(prev => [...prev, assistantMessage]);
  }, [currentMode]);

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
        addAssistantMessage,
        clearMessages,
        setSidebarOpen,
        createNewChat,
        createChatForProject,
        selectChat,
        deleteChat,
        renameChat,
        pinChat,
        archiveChat,
        moveChatToProject,
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
