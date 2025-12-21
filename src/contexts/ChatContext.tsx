import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Message, ChatMode, ChatProject } from '@/types/chat';

interface ChatContextType {
  messages: Message[];
  currentMode: ChatMode;
  projects: ChatProject[];
  currentProjectId: string | null;
  sidebarOpen: boolean;
  isLoading: boolean;
  setCurrentMode: (mode: ChatMode) => void;
  addMessage: (content: string, role: 'user' | 'assistant') => void;
  clearMessages: () => void;
  setSidebarOpen: (open: boolean) => void;
  createNewProject: (name?: string) => void;
  selectProject: (id: string) => void;
  deleteProject: (id: string) => void;
  setIsLoading: (loading: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMode, setCurrentMode] = useState<ChatMode>('conversation');
  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = useCallback((content: string, role: 'user' | 'assistant') => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
      mode: currentMode,
    };
    setMessages(prev => [...prev, newMessage]);
  }, [currentMode]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const createNewProject = useCallback((name?: string) => {
    const newProject: ChatProject = {
      id: crypto.randomUUID(),
      name: name || `Chat ${projects.length + 1}`,
      messages: [],
      mode: currentMode,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setProjects(prev => [newProject, ...prev]);
    setCurrentProjectId(newProject.id);
    setMessages([]);
  }, [projects.length, currentMode]);

  const selectProject = useCallback((id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      setCurrentProjectId(id);
      setMessages(project.messages);
      setCurrentMode(project.mode);
    }
  }, [projects]);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (currentProjectId === id) {
      setCurrentProjectId(null);
      setMessages([]);
    }
  }, [currentProjectId]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        currentMode,
        projects,
        currentProjectId,
        sidebarOpen,
        isLoading,
        setCurrentMode,
        addMessage,
        clearMessages,
        setSidebarOpen,
        createNewProject,
        selectProject,
        deleteProject,
        setIsLoading,
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
