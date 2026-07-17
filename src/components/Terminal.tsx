import React, { useState, useEffect, useRef } from 'react';
import { getInitialState, saveState, mutateFs, resolvePath, getFileName, getParentPath, FSState, FileNode } from '../utils/fileSystem';

interface HistoryItem {
  id: string;
  type: 'input' | 'output' | 'error';
  content: string | React.ReactNode;
}

export default function Terminal({ onLogout }: { onLogout: () => void }) {
  const [fs, setFs] = useState<FSState>(getInitialState());
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [input, setInput] = useState('');
  
  // Command history for up/down arrows
  const [commandHistory, setCommandHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('evos_command_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [sudoPrompt, setSudoPrompt] = useState<{ command: string } | null>(null);

  const [commandCount, setCommandCount] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastDismissed, setToastDismissed] = useState(false);

  useEffect(() => {
    if (toastDismissed) return;
    const timer = setTimeout(() => {
      setShowToast(true);
    }, 45000);
    return () => clearTimeout(timer);
  }, [toastDismissed]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Focus input on any click
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const addHistory = (type: 'input' | 'output' | 'error', content: string | React.ReactNode) => {
    setHistory(prev => [...prev, { id: Math.random().toString(36).substring(7), type, content }]);
  };

  const executeCommand = (cmdStr: string, isSudo: boolean = false) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    if (!isSudo && cmdStr !== 'sudo') {
      setCommandCount(prev => {
        const next = prev + 1;
        if (next === 5 && !toastDismissed) {
          setShowToast(true);
        }
        return next;
      });
    }

    if (!isSudo) {
      // Save to command history
      const newHistory = [...commandHistory, trimmed];
      setCommandHistory(newHistory);
      setHistoryIndex(-1);
      localStorage.setItem('evos_command_history', JSON.stringify(newHistory));

      addHistory('input', `evstudent@evcyberacademy:${fs.cwd}$ ${trimmed}`);
    }
    
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    switch (cmd) {
      case 'sudo':
        if (args.length === 0) {
          addHistory('error', 'usage: sudo <command>');
        } else {
          setSudoPrompt({ command: args.join(' ') });
        }
        break;

      case 'help':
        addHistory('output', (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 pt-2 opacity-90">
              <p><span className="text-zinc-400">ls</span> - List directory content</p>
              <p><span className="text-zinc-400">cd [dir]</span> - Change directory</p>
              <p><span className="text-zinc-400">mkdir [dir]</span> - Create directory</p>
              <p><span className="text-zinc-400">touch [file]</span> - Create file</p>
              <p><span className="text-zinc-400">cat [file]</span> - Read file content</p>
              <p><span className="text-zinc-400">pwd</span> - Print working directory</p>
              <p><span className="text-zinc-400">whoami</span> - Show current user</p>
              <p><span className="text-zinc-400">clear</span> - Clear terminal</p>
              <p><span className="text-zinc-400">echo</span> - Print text</p>
              <p><span className="text-zinc-400">help</span> - Show this message</p>
              <p><span className="text-zinc-400">exit</span> - Logout of EV OS</p>
            </div>
            <p className="text-yellow-400 font-bold text-[11px] sm:text-xs">
              *** SYSTEM MESSAGE: Master advanced commands and ethical hacking in the CSSP program. Grab your 50% discount using the link above! ***
            </p>
          </div>
        ));
        break;
      
      case 'clear':
        setHistory([]);
        break;

      case 'pwd':
        addHistory('output', fs.cwd);
        break;

      case 'whoami':
        addHistory('output', 'evlabs');
        break;

      case 'echo':
        addHistory('output', args.join(' '));
        break;
      
      case 'exit':
        localStorage.removeItem('evos_auth');
        onLogout();
        break;

      case 'ls': {
        const targetPath = args[0] || '.';
        const { node, absolutePath } = resolvePath(fs.root, fs.cwd, targetPath);
        
        if (!node) {
          addHistory('error', `ls: cannot access '${targetPath}': No such file or directory`);
        } else if (node.type === 'file') {
          const isExec = node.isExecutable;
          addHistory('output', (
            <span className={isExec ? 'text-green-400 font-bold' : 'text-zinc-300'}>
              {targetPath}
            </span>
          ));
        } else {
          const children = node.children || {};
          const keys = Object.keys(children).sort();
          if (keys.length === 0) {
            addHistory('output', '');
          } else {
            addHistory('output', (
              <div className="flex flex-wrap gap-4">
                {keys.map(k => {
                  const child = children[k];
                  const isDir = child.type === 'dir';
                  const isExec = child.type === 'file' && child.isExecutable;
                  const className = isDir ? 'text-blue-400 font-bold' : isExec ? 'text-green-400 font-bold' : 'text-zinc-300';
                  return (
                    <span key={k} className={className}>
                      {k}{isDir ? '/' : ''}
                    </span>
                  );
                })}
              </div>
            ));
          }
        }
        break;
      }

      case 'cd': {
        const targetPath = args[0];
        if (!targetPath) {
          setFs(prev => {
            const newState = { ...prev, cwd: '/home/guest' };
            saveState(newState);
            return newState;
          });
          break;
        }

        const { node, absolutePath } = resolvePath(fs.root, fs.cwd, targetPath);
        if (!node) {
          addHistory('error', `cd: ${targetPath}: No such file or directory`);
        } else if (node.type === 'file') {
          addHistory('error', `cd: ${targetPath}: Not a directory`);
        } else {
          setFs(prev => {
            const newState = { ...prev, cwd: absolutePath };
            saveState(newState);
            return newState;
          });
        }
        break;
      }

      case 'mkdir': {
        const targetPath = args[0];
        if (!targetPath) {
          addHistory('error', 'mkdir: missing operand');
          break;
        }
        const { node: existingNode, absolutePath } = resolvePath(fs.root, fs.cwd, targetPath);
        if (existingNode) {
          addHistory('error', `mkdir: cannot create directory '${targetPath}': File exists`);
          break;
        }
        
        const parentPath = getParentPath(absolutePath);
        const dirName = getFileName(absolutePath);
        const { node: parentNode } = resolvePath(fs.root, fs.cwd, parentPath);
        
        if (!parentNode || parentNode.type !== 'dir') {
          addHistory('error', `mkdir: cannot create directory '${targetPath}': No such file or directory`);
          break;
        }

        const newFs = mutateFs(fs, (draftRoot) => {
          let current: FileNode | undefined = draftRoot;
          const parts = parentPath.split('/').filter(Boolean);
          for (const p of parts) {
            if (current && current.children) current = current.children[p];
          }
          if (current && current.children) {
            current.children[dirName] = { type: 'dir', children: {} };
          } else if (current) {
             current.children = { [dirName]: { type: 'dir', children: {} } };
          }
        });
        setFs(newFs);
        break;
      }

      case 'touch': {
        const targetPath = args[0];
        if (!targetPath) {
          addHistory('error', 'touch: missing file operand');
          break;
        }
        const { node: existingNode, absolutePath } = resolvePath(fs.root, fs.cwd, targetPath);
        if (existingNode) {
          break; // touch existing file does nothing in this simple mock
        }
        
        const parentPath = getParentPath(absolutePath);
        const fileName = getFileName(absolutePath);
        const { node: parentNode } = resolvePath(fs.root, fs.cwd, parentPath);
        
        if (!parentNode || parentNode.type !== 'dir') {
          addHistory('error', `touch: cannot touch '${targetPath}': No such file or directory`);
          break;
        }

        const newFs = mutateFs(fs, (draftRoot) => {
          let current: FileNode | undefined = draftRoot;
          const parts = parentPath.split('/').filter(Boolean);
          for (const p of parts) {
            if (current && current.children) current = current.children[p];
          }
          if (current && current.children) {
            current.children[fileName] = { type: 'file', content: '' };
          } else if (current) {
             current.children = { [fileName]: { type: 'file', content: '' } };
          }
        });
        setFs(newFs);
        break;
      }

      case 'cat': {
        const targetPath = args[0];
        if (!targetPath) {
          addHistory('error', 'cat: missing file operand');
          break;
        }
        const { node } = resolvePath(fs.root, fs.cwd, targetPath);
        if (!node) {
          addHistory('error', `cat: ${targetPath}: No such file or directory`);
        } else if (node.type === 'dir') {
          addHistory('error', `cat: ${targetPath}: Is a directory`);
        } else if (node.isPrivileged && !isSudo) {
          addHistory('error', `cat: ${targetPath}: Permission denied`);
        } else {
          addHistory('output', node.content || '');
        }
        break;
      }

      default:
        addHistory('error', `evos: command not found: ${cmd}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sudoPrompt) {
      const pwd = input.trim();
      addHistory('input', `[sudo] password for evstudent: ${'*'.repeat(pwd.length)}`);
      
      if (pwd === 'evcyber2026') {
        executeCommand(sudoPrompt.command, true);
      } else {
        addHistory('error', 'sudo: incorrect password');
      }
      setSudoPrompt(null);
      setInput('');
      return;
    }
    executeCommand(input);
    setInput('');
  };

  const quickActions = [
    { label: 'ls', cmd: 'ls' },
    { label: 'cd ..', cmd: 'cd ..' },
    { label: 'clear', cmd: 'clear' },
    { label: 'help', cmd: 'help' },
    { label: 'pwd', cmd: 'pwd' },
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIndex = historyIndex + 1;
        if (nextIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(nextIndex);
          setInput(commandHistory[nextIndex]);
        }
      }
    }
  };

  return (
    <div 
      className="flex flex-col w-full h-[100dvh] bg-black text-green-500 font-mono overflow-hidden select-none"
      onClick={handleContainerClick}
    >
      {/* Top Status Bar */}
      <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 text-[10px] tracking-widest text-zinc-400 uppercase shrink-0">
        <div>System Status: <span className="text-green-400">Secure</span></div>
        <div className="font-sans flex gap-6"><span>Signal: 100%</span></div>
      </div>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.05),transparent_70%)]"></div>
        
        {/* Scrollable output area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 text-sm leading-relaxed z-10 pb-32 sm:pb-32">
          <div className="text-zinc-500 opacity-50 mb-8">[EV OS v1.0.4 - Initializing Virtual Environment... OK]</div>
          <div className="space-y-1">
            <p className="text-green-400/80">Welcome to EV OS Terminal Emulation</p>
            <p className="text-green-400/80">Copyright (c) 2026 EV CYBER ACADEMY. All Rights Reserved.</p>
          </div>
          
          <div className="pt-4 space-y-3 break-words">
            {history.map((item) => (
              <div key={item.id} className="whitespace-pre-wrap">
                {item.type === 'input' && <p className="opacity-60">{item.content}</p>}
                {item.type === 'error' && <p className="text-red-400">{item.content}</p>}
                {item.type === 'output' && <div className="text-green-300">{item.content}</div>}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Fixed bottom input area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-950 border-t border-zinc-800 space-y-4 z-20">
          {/* Quick Actions */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                onClick={(e) => {
                  e.stopPropagation(); // don't trigger container focus
                  executeCommand(qa.cmd);
                  inputRef.current?.focus();
                }}
                className={`px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-colors shrink-0 ${qa.cmd === 'help' ? 'bg-green-900/20 border-green-800/50 text-green-400' : 'text-zinc-300'}`}
              >
                {qa.label}
              </button>
            ))}
          </div>
          
          <form onSubmit={handleSubmit} className="flex items-center gap-4 bg-black border border-zinc-800 p-3 rounded-md shadow-inner">
            {sudoPrompt ? (
              <span className="text-zinc-500 whitespace-nowrap">[sudo] password for evstudent:</span>
            ) : (
              <>
                <span className="text-green-800 hidden sm:inline whitespace-nowrap">evstudent@evcyberacademy:{fs.cwd}$</span>
                <span className="text-green-800 sm:hidden">$</span>
              </>
            )}
            <input
              ref={inputRef}
              type={sudoPrompt ? "password" : "text"}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setHistoryIndex(-1); // Reset index on manual edit
              }}
              onKeyDown={handleKeyDown}
              className="bg-transparent border-none outline-none text-green-500 w-full placeholder:text-zinc-800"
              placeholder={sudoPrompt ? "" : "Enter command..."}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </form>
        </div>
      </main>

      {/* Persistent CTA Buttons */}
      <div className="fixed top-14 right-4 z-50 flex flex-col items-end gap-3 pointer-events-none">
        <a 
          href="https://evcyberacademy.in/payment" 
          target="_blank" 
          rel="noopener noreferrer"
          className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 bg-green-500 text-black border border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.8)] rounded-md animate-pulse hover:bg-green-400 hover:shadow-[0_0_30px_rgba(34,197,94,1)] transition-all text-[11px] sm:text-sm font-extrabold tracking-widest uppercase"
        >
          🚀 Join CSSP for 50% Offer!
        </a>
        
        <a 
          href="tel:9789459354"
          className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-green-400 border border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)] rounded-md hover:bg-zinc-800 transition-colors text-[10px] sm:text-xs font-bold tracking-wider uppercase"
        >
          📞 BOOK A CALL: 9789459354
        </a>
      </div>

      {/* Smart Toast Notification */}
      {showToast && !toastDismissed && (
        <div className="fixed top-28 right-4 left-4 sm:left-auto sm:w-80 z-50 bg-zinc-950 border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.15)] rounded-md p-4 overflow-hidden transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>
          <button 
            onClick={() => {
              setShowToast(false);
              setToastDismissed(true);
            }}
            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
          >
            ✕
          </button>
          <div className="mt-1 space-y-3">
            <h3 className="text-green-400 font-bold text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              SYSTEM ALERT
            </h3>
            <p className="text-zinc-300 text-xs leading-relaxed">
              Thanks for accessing the EV OS Lab! 🔥 Ready to master cybersecurity? Enroll in the CSSP Cyber Security Starter Program today.
            </p>
            <a 
              href="https://evcyberacademy.in/payment" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full text-center py-2 bg-green-600 hover:bg-green-500 text-black font-bold text-xs uppercase tracking-widest rounded transition-colors"
            >
              Claim 50% Off Now
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
