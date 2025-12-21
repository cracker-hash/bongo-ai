import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'bongo_ai_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Mock authentication - in production, this would call an API
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const newUser: User = {
      id: crypto.randomUUID(),
      email,
      name: email.split('@')[0],
    };

    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    setShowAuthModal(false);
    
    return { success: true };
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    if (!email || !password || !name) {
      return { success: false, error: 'All fields are required' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    if (!email.includes('@')) {
      return { success: false, error: 'Please enter a valid email' };
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const newUser: User = {
      id: crypto.randomUUID(),
      email,
      name,
    };

    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    setShowAuthModal(false);
    
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        showAuthModal,
        setShowAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
