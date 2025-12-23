import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message, ChatMode } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface StoredChat {
  id: string;
  name: string;
  mode: ChatMode;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

export function useChatStorage() {
  const { user, isAuthenticated } = useAuth();
  const [chats, setChats] = useState<StoredChat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);

  // Load all chats for the user
  const loadChats = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    setIsLoadingChats(true);
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          name,
          mode,
          created_at,
          updated_at,
          messages:messages(count)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const formattedChats: StoredChat[] = (data || []).map((chat: any) => ({
        id: chat.id,
        name: chat.name,
        mode: chat.mode as ChatMode,
        createdAt: new Date(chat.created_at),
        updatedAt: new Date(chat.updated_at),
        messageCount: chat.messages?.[0]?.count || 0,
      }));

      setChats(formattedChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setIsLoadingChats(false);
    }
  }, [isAuthenticated, user]);

  // Create a new chat
  const createChat = useCallback(async (name: string, mode: ChatMode): Promise<string | null> => {
    if (!isAuthenticated || !user) return null;

    try {
      const { data, error } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          name,
          mode,
        })
        .select('id')
        .single();

      if (error) throw error;
      
      await loadChats();
      return data.id;
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create chat');
      return null;
    }
  }, [isAuthenticated, user, loadChats]);

  // Load messages for a specific chat
  const loadMessages = useCallback(async (chatId: string): Promise<Message[]> => {
    if (!isAuthenticated || !user) return [];

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        mode: msg.mode as ChatMode,
      }));
    } catch (error) {
      console.error('Error loading messages:', error);
      return [];
    }
  }, [isAuthenticated, user]);

  // Save a message
  const saveMessage = useCallback(async (
    chatId: string,
    content: string,
    role: 'user' | 'assistant',
    mode: ChatMode
  ): Promise<string | null> => {
    if (!isAuthenticated || !user) return null;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: user.id,
          content,
          role,
          mode,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Update chat's updated_at
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);

      return data.id;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  }, [isAuthenticated, user]);

  // Update chat name
  const updateChatName = useCallback(async (chatId: string, name: string) => {
    if (!isAuthenticated || !user) return;

    try {
      const { error } = await supabase
        .from('chats')
        .update({ name })
        .eq('id', chatId);

      if (error) throw error;
      await loadChats();
    } catch (error) {
      console.error('Error updating chat name:', error);
    }
  }, [isAuthenticated, user, loadChats]);

  // Delete a chat
  const deleteChat = useCallback(async (chatId: string) => {
    if (!isAuthenticated || !user) return;

    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) throw error;
      
      setChats(prev => prev.filter(c => c.id !== chatId));
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    }
  }, [isAuthenticated, user]);

  // Load chats on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      loadChats();
    } else {
      setChats([]);
    }
  }, [isAuthenticated, loadChats]);

  return {
    chats,
    isLoadingChats,
    loadChats,
    createChat,
    loadMessages,
    saveMessage,
    updateChatName,
    deleteChat,
  };
}
