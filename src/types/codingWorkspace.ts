export interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  language?: string;
}

export function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    html: 'html', css: 'css', json: 'json', md: 'markdown',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
    java: 'java', php: 'php', sql: 'sql', yml: 'yaml', yaml: 'yaml',
    sh: 'shell', bash: 'shell', txt: 'plaintext', env: 'plaintext',
    xml: 'xml', svg: 'xml', vue: 'html', scss: 'scss', less: 'less',
  };
  return map[ext] || 'plaintext';
}

export function buildFileTree(files: ProjectFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');

      if (isFile) {
        current.push({ name, path, type: 'file', language: file.language });
      } else {
        let folder = current.find(n => n.name === name && n.type === 'folder');
        if (!folder) {
          folder = { name, path, type: 'folder', children: [] };
          current.push(folder);
        }
        current = folder.children!;
      }
    }
  }

  const sortTree = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => n.children && sortTree(n.children));
  };
  sortTree(root);

  return root;
}

export function parseProjectFromAIResponse(text: string): ProjectFile[] {
  const files: ProjectFile[] = [];

  // Pattern 1: ---FILE: path--- ... ---END FILE---
  const p1 = /---FILE:\s*(.+?)---\n([\s\S]*?)---END FILE---/g;
  let m;
  while ((m = p1.exec(text)) !== null) {
    const path = m[1].trim();
    files.push({ path, content: m[2].trim(), language: getLanguageFromPath(path) });
  }
  if (files.length > 0) return files;

  // Pattern 2: **path/to/file.ext** followed by code block
  const p2 = /\*\*([^\*]+\.[a-zA-Z]+)\*\*\s*\n```(?:\w+)?\n([\s\S]*?)```/g;
  while ((m = p2.exec(text)) !== null) {
    const path = m[1].trim();
    files.push({ path, content: m[2].trim(), language: getLanguageFromPath(path) });
  }
  if (files.length > 0) return files;

  // Pattern 3: `path/to/file.ext`: followed by code block
  const p3 = /`([^`]+\.[a-zA-Z]+)`[:\s]*\n```(?:\w+)?\n([\s\S]*?)```/g;
  while ((m = p3.exec(text)) !== null) {
    const path = m[1].trim();
    files.push({ path, content: m[2].trim(), language: getLanguageFromPath(path) });
  }
  if (files.length > 0) return files;

  // Pattern 4: ### path/file.ext or ## path/file.ext followed by code block
  const p4 = /#{2,4}\s+([^\n]+\.[a-zA-Z]+)\s*\n```(?:\w+)?\n([\s\S]*?)```/g;
  while ((m = p4.exec(text)) !== null) {
    const path = m[1].trim();
    files.push({ path, content: m[2].trim(), language: getLanguageFromPath(path) });
  }

  return files;
}
