import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { ProjectFile, parseProjectFromAIResponse } from '@/types/codingWorkspace';
import JSZip from 'jszip';

interface CodingWorkspaceContextType {
  files: ProjectFile[];
  openTabs: string[];
  activeTab: string | null;
  projectName: string;
  isWorkspaceOpen: boolean;
  showPreview: boolean;
  loadProject: (name: string, files: ProjectFile[]) => void;
  openFile: (path: string) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  addFile: (path: string, content: string) => void;
  deleteFile: (path: string) => void;
  setShowPreview: (show: boolean) => void;
  setIsWorkspaceOpen: (open: boolean) => void;
  parseAndLoadFromResponse: (text: string, name?: string) => boolean;
  downloadProject: () => Promise<void>;
  clearProject: () => void;
  getFileContent: (path: string) => string | undefined;
}

const CodingWorkspaceContext = createContext<CodingWorkspaceContextType | undefined>(undefined);

export function CodingWorkspaceProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('my-project');
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const loadProject = useCallback((name: string, newFiles: ProjectFile[]) => {
    setProjectName(name);
    setFiles(newFiles);
    setIsWorkspaceOpen(true);
    if (newFiles.length > 0) {
      const firstFile = newFiles[0].path;
      setOpenTabs([firstFile]);
      setActiveTab(firstFile);
    }
  }, []);

  const openFile = useCallback((path: string) => {
    setOpenTabs(prev => prev.includes(path) ? prev : [...prev, path]);
    setActiveTab(path);
  }, []);

  const closeTab = useCallback((path: string) => {
    setOpenTabs(prev => {
      const next = prev.filter(p => p !== path);
      if (activeTab === path) {
        setActiveTab(next.length > 0 ? next[next.length - 1] : null);
      }
      return next;
    });
  }, [activeTab]);

  const updateFileContent = useCallback((path: string, content: string) => {
    setFiles(prev => prev.map(f => f.path === path ? { ...f, content } : f));
  }, []);

  const addFile = useCallback((path: string, content: string) => {
    const lang = path.split('.').pop()?.toLowerCase() || 'plaintext';
    const langMap: Record<string, string> = { js: 'javascript', ts: 'typescript', py: 'python', html: 'html', css: 'css', json: 'json' };
    setFiles(prev => [...prev, { path, content, language: langMap[lang] || lang }]);
  }, []);

  const deleteFile = useCallback((path: string) => {
    setFiles(prev => prev.filter(f => f.path !== path));
    setOpenTabs(prev => prev.filter(p => p !== path));
    if (activeTab === path) setActiveTab(null);
  }, [activeTab]);

  const parseAndLoadFromResponse = useCallback((text: string, name?: string): boolean => {
    const parsed = parseProjectFromAIResponse(text);
    if (parsed.length > 0) {
      // Merge with existing files or replace
      setFiles(prev => {
        const existing = new Map(prev.map(f => [f.path, f]));
        parsed.forEach(f => existing.set(f.path, f));
        return Array.from(existing.values());
      });
      if (!isWorkspaceOpen) {
        setIsWorkspaceOpen(true);
        if (name) setProjectName(name);
      }
      // Open first new file
      if (parsed.length > 0) {
        const first = parsed[0].path;
        setOpenTabs(prev => prev.includes(first) ? prev : [...prev, first]);
        setActiveTab(first);
      }
      return true;
    }
    return false;
  }, [isWorkspaceOpen]);

  const downloadProject = useCallback(async () => {
    const zip = new JSZip();
    files.forEach(f => zip.file(f.path, f.content));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [files, projectName]);

  const clearProject = useCallback(() => {
    setFiles([]);
    setOpenTabs([]);
    setActiveTab(null);
    setIsWorkspaceOpen(false);
    setShowPreview(false);
  }, []);

  const getFileContent = useCallback((path: string) => {
    return files.find(f => f.path === path)?.content;
  }, [files]);

  return (
    <CodingWorkspaceContext.Provider value={{
      files, openTabs, activeTab, projectName, isWorkspaceOpen, showPreview,
      loadProject, openFile, closeTab, setActiveTab, updateFileContent,
      addFile, deleteFile, setShowPreview, setIsWorkspaceOpen,
      parseAndLoadFromResponse, downloadProject, clearProject, getFileContent,
    }}>
      {children}
    </CodingWorkspaceContext.Provider>
  );
}

export function useCodingWorkspace() {
  const ctx = useContext(CodingWorkspaceContext);
  if (!ctx) throw new Error('useCodingWorkspace must be used within CodingWorkspaceProvider');
  return ctx;
}
