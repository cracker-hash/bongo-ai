import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { Message, ChatMode, AIModel, MessageImage, DocumentAttachment } from '@/types/chat';
import { useChatStorage, StoredChat } from '@/hooks/useChatStorage';
import { useAuth } from '@/contexts/AuthContext';
import { streamChat, generateImage } from '@/lib/streamChat';
import { supabase } from '@/integrations/supabase/client';
import { useGamification } from '@/hooks/useGamification';
import { useCredits } from '@/hooks/useCredits';
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

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

const getIsMobile = () => typeof window !== 'undefined' && window.innerWidth < 1024;

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMode, setCurrentMode] = useState<ChatMode>('conversation');
  const [currentModel, setCurrentModel] = useState<AIModel>('gpt-4o-mini');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(!getIsMobile());
  const [isLoading, setIsLoading] = useState(false);
  const streamingMessageRef = useRef<string>('');

  const { user, isAuthenticated } = useAuth();
  const { awardXP } = useGamification();
  const { deductCredits, credits, canAfford } = useCredits();
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

  // Helper to show out of credits toast
  const showOutOfCreditsToast = useCallback(() => {
    toast.custom((t) => (
      <div className="bg-card border border-border rounded-lg p-4 shadow-lg max-w-md">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-destructive">
            <span className="text-lg">😢</span>
            <span className="font-semibold">Oops! You're Out of Credits</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Upgrade to Wiser AI 2.0 Max to enjoy unlimited features and premium capabilities.
          </p>
          <a 
            href="/pricing" 
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            onClick={() => toast.dismiss(t)}
          >
            Upgrade Now
          </a>
        </div>
      </div>
    ), { duration: 8000 });
  }, []);

  const sendMessage = useCallback(async (content: string, images?: string[], document?: DocumentAttachment) => {
    const lowerContent = content.toLowerCase();
    
    // Check request types
    const isImageGenRequest = lowerContent.startsWith('generate an image:') || 
                              lowerContent.startsWith('create an image:') ||
                              lowerContent.startsWith('draw ') ||
                              lowerContent.includes('generate an image of');
    
    const isVideoGenRequest = lowerContent.startsWith('generate a video:') || 
                              lowerContent.startsWith('create a video:') ||
                              lowerContent.includes('generate a video of') ||
                              lowerContent.includes('make a video');
    
    const isAudioGenRequest = lowerContent.startsWith('generate audio:') || 
                              lowerContent.startsWith('create audio:') ||
                              lowerContent.includes('generate audio of') ||
                              lowerContent.includes('text to speech:') ||
                              lowerContent.startsWith('speak:');
    
    // Task execution requests (autonomous agent tasks)
    const isTaskExecution = lowerContent.startsWith('execute task:') ||
                            lowerContent.startsWith('run task:') ||
                            lowerContent.startsWith('automate:') ||
                            lowerContent.includes('execute this task') ||
                            lowerContent.includes('run automation') ||
                            lowerContent.startsWith('task:');
    
    // Connector action requests (external service interactions)
    const isConnectorAction = lowerContent.includes('connect to') ||
                              lowerContent.includes('sync with') ||
                              lowerContent.includes('fetch from notion') ||
                              lowerContent.includes('fetch from linear') ||
                              lowerContent.includes('get from google drive') ||
                              lowerContent.includes('upload to') ||
                              lowerContent.includes('send to slack') ||
                              lowerContent.includes('post to') ||
                              lowerContent.startsWith('connector:');
    
    // Web deployment requests
    const isWebDeployment = lowerContent.startsWith('deploy:') ||
                            lowerContent.startsWith('deploy to') ||
                            lowerContent.includes('deploy website') ||
                            lowerContent.includes('deploy app') ||
                            lowerContent.includes('publish website') ||
                            lowerContent.includes('publish app') ||
                            lowerContent.includes('go live');
    
    // Music generation requests
    const isMusicGenRequest = lowerContent.startsWith('generate music:') ||
                              lowerContent.startsWith('create music:') ||
                              lowerContent.includes('compose music') ||
                              lowerContent.includes('make a song') ||
                              lowerContent.includes('generate a beat') ||
                              lowerContent.startsWith('music:');

    // Handle credit deductions for premium features (only for authenticated users)
    if (isAuthenticated && user) {
      if (isTaskExecution) {
        if (!canAfford('task_execution')) {
          showOutOfCreditsToast();
          return;
        }
        const result = await deductCredits('task_execution', undefined, 'Task execution (10 credits)');
        if (!result.success) {
          toast.error('Failed to process credits. Please try again.');
          return;
        }
      } else if (isConnectorAction) {
        if (!canAfford('connector_action')) {
          showOutOfCreditsToast();
          return;
        }
        const result = await deductCredits('connector_action', undefined, 'Connector action (5 credits)');
        if (!result.success) {
          toast.error('Failed to process credits. Please try again.');
          return;
        }
      } else if (isVideoGenRequest) {
        if (!canAfford('video_generation')) {
          showOutOfCreditsToast();
          return;
        }
        const result = await deductCredits('video_generation', undefined, 'Video generation (200 credits)');
        if (!result.success) {
          toast.error('Failed to process credits. Please try again.');
          return;
        }
      } else if (isAudioGenRequest) {
        if (!canAfford('audio_generation')) {
          showOutOfCreditsToast();
          return;
        }
        const result = await deductCredits('audio_generation', undefined, 'Audio generation (30 credits)');
        if (!result.success) {
          toast.error('Failed to process credits. Please try again.');
          return;
        }
      } else if (isImageGenRequest) {
        if (!canAfford('image_generation')) {
          showOutOfCreditsToast();
          return;
        }
        const result = await deductCredits('image_generation', undefined, 'Image generation (50 credits)');
        if (!result.success) {
          toast.error('Failed to process credits. Please try again.');
          return;
        }
      } else if (isWebDeployment) {
        if (!canAfford('web_deployment')) {
          showOutOfCreditsToast();
          return;
        }
        const result = await deductCredits('web_deployment', undefined, 'Web deployment (100 credits)');
        if (!result.success) {
          toast.error('Failed to process credits. Please try again.');
          return;
        }
      } else if (isMusicGenRequest) {
        if (!canAfford('music_generation')) {
          showOutOfCreditsToast();
          return;
        }
        const result = await deductCredits('music_generation', undefined, 'Music generation (40 credits)');
        if (!result.success) {
          toast.error('Failed to process credits. Please try again.');
          return;
        }
      }
    }

    // For unauthenticated users, block premium features that require auth
    if (!isAuthenticated && (isImageGenRequest || isVideoGenRequest || isAudioGenRequest || isMusicGenRequest)) {
      toast.error('Please sign in to use this feature');
      return;
    }

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

    // Create chat if needed (only for authenticated users)
    if (isAuthenticated && user && !chatId) {
      const chatName = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      chatId = await createChat(chatName, currentMode);
      if (chatId) {
        setCurrentChatId(chatId);
      }
    }

    // Save user message (only for authenticated users)
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
        
        // Auto-save generated image to gallery (only for authenticated users)
        if (result.generatedImage && isAuthenticated && user) {
          try {
            const { data: insertedImage } = await supabase.from('generated_images').insert({
              user_id: user.id,
              url: result.generatedImage,
              prompt: imagePrompt,
              chat_id: chatId || null,
            }).select('id').single();
            
            const { count } = await supabase
              .from('generated_images')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id);
            
            awardXP('generateImage', undefined, count || 1);
            
            toast.success('Image saved to gallery');
          } catch (saveError) {
            console.error('Failed to save image to gallery:', saveError);
          }
        }
        
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
      model: currentModel,
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
        // Save assistant message (only for authenticated users)
        if (isAuthenticated && user && chatId && streamingMessageRef.current) {
          await saveMessage(chatId, streamingMessageRef.current, 'assistant', currentMode);
          loadChats();
        }
      },
      onError: (error) => {
        setIsLoading(false);
        toast.error(error);
        setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
      },
    });
  }, [currentMode, currentChatId, messages, isAuthenticated, user, createChat, saveMessage, loadChats, deductCredits, canAfford, showOutOfCreditsToast]);

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
