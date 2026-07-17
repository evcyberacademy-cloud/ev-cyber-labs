export type FileNode = {
  type: 'file' | 'dir';
  content?: string;
  isExecutable?: boolean;
  children?: Record<string, FileNode>;
};

export interface FSState {
  root: FileNode;
  cwd: string;
}

const INITIAL_FS: FileNode = {
  type: 'dir',
  children: {
    home: {
      type: 'dir',
      children: {
        guest: {
          type: 'dir',
          children: {
            'welcome.txt': { type: 'file', content: 'Welcome to EV OS!\nType "help" to see available commands.' },
            'about.txt': { type: 'file', content: 'EV OS is a mobile-first Linux terminal simulator for beginners.' },
            'run.sh': { type: 'file', content: 'echo "Executing run script..."', isExecutable: true }
          }
        }
      }
    }
  }
};

export const getInitialState = (): FSState => {
  const saved = localStorage.getItem('evos_fs');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse fs state', e);
    }
  }
  return {
    root: INITIAL_FS,
    cwd: '/home/guest'
  };
};

export const saveState = (state: FSState) => {
  localStorage.setItem('evos_fs', JSON.stringify(state));
};

export const resolvePath = (root: FileNode, currentPath: string, targetPath: string): { node: FileNode | null, absolutePath: string } => {
  const isAbsolute = targetPath.startsWith('/');
  let pathParts = (isAbsolute ? targetPath : `${currentPath}/${targetPath}`).split('/').filter(p => p !== '' && p !== '.');
  
  const finalParts: string[] = [];
  for (const part of pathParts) {
    if (part === '..') {
      finalParts.pop();
    } else {
      finalParts.push(part);
    }
  }
  
  let currentNode = root;
  for (const part of finalParts) {
    if (currentNode.type !== 'dir' || !currentNode.children || !currentNode.children[part]) {
      return { node: null, absolutePath: '/' + finalParts.join('/') };
    }
    currentNode = currentNode.children[part];
  }
  
  return { node: currentNode, absolutePath: '/' + finalParts.join('/') };
};

export const getParentPath = (path: string): string => {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return '/' + parts.join('/');
};

export const getFileName = (path: string): string => {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
};

export const mutateFs = (state: FSState, fn: (draftRoot: FileNode) => void): FSState => {
  const newRoot = JSON.parse(JSON.stringify(state.root));
  fn(newRoot);
  const newState = { ...state, root: newRoot };
  saveState(newState);
  return newState;
};
