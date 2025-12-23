import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Message, ChatMode, ChatProject, AIModel } from '@/types/chat';

interface ChatContextType {
  messages: Message[];
  currentMode: ChatMode;
  currentModel: AIModel;
  projects: ChatProject[];
  currentProjectId: string | null;
  sidebarOpen: boolean;
  isLoading: boolean;
  setCurrentMode: (mode: ChatMode) => void;
  setCurrentModel: (model: AIModel) => void;
  addMessage: (content: string, role: 'user' | 'assistant') => void;
  clearMessages: () => void;
  setSidebarOpen: (open: boolean) => void;
  createNewProject: (name?: string) => void;
  selectProject: (id: string) => void;
  deleteProject: (id: string) => void;
  setIsLoading: (loading: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Check if screen is mobile
const getIsMobile = () => typeof window !== 'undefined' && window.innerWidth < 1024;

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMode, setCurrentMode] = useState<ChatMode>('conversation');
  const [currentModel, setCurrentModel] = useState<AIModel>('gpt-4');
  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  // Start with sidebar closed on mobile, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(!getIsMobile());
  const [isLoading, setIsLoading] = useState(false);

  // Only auto-close sidebar when transitioning TO mobile size
  useEffect(() => {
    let prevIsMobile = getIsMobile();
    const handleResize = () => {
      const nowMobile = getIsMobile();
      // Only close when transitioning from desktop to mobile
      if (!prevIsMobile && nowMobile) {
        setSidebarOpen(false);
      }
      prevIsMobile = nowMobile;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        currentModel,
        projects,
        currentProjectId,
        sidebarOpen,
        isLoading,
        setCurrentMode,
        setCurrentModel,
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
