import React, { useState } from 'react';
import { Terminal as TerminalIcon, Lock } from 'lucide-react';

interface GateKeeperProps {
  onUnlock: () => void;
}

export default function GateKeeper({ onUnlock }: GateKeeperProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'evlabs2026') {
      localStorage.setItem('evos_auth', 'true');
      onUnlock();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-[100dvh] bg-black text-primary-500 font-mono p-4 relative overflow-hidden select-none">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(var(--theme-500),0.05),transparent_70%)]"></div>
      <div className="flex flex-col items-center max-w-sm w-full space-y-6 z-10">
        <div className="flex items-center justify-center w-16 h-16 bg-zinc-900 rounded-full border border-zinc-800 mb-4 shadow-inner">
          <TerminalIcon className="w-8 h-8 text-primary-400" />
        </div>
        
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-bold tracking-widest text-primary-400">EV OS</h1>
          <p className="text-sm text-primary-700">EV CYBER ACADEMY - Restricted Access</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-primary-700" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              className={`block w-full pl-10 pr-3 py-3 border ${error ? 'border-red-500 text-red-500 focus:ring-red-500 focus:border-red-500' : 'border-zinc-800 text-primary-500 focus:ring-primary-500 focus:border-zinc-700'} bg-zinc-950 rounded-md leading-5 placeholder-zinc-800 shadow-inner focus:outline-none focus:ring-1 sm:text-sm`}
              placeholder="Enter passcode..."
              autoFocus
            />
          </div>
          {error && <p className="text-red-500 text-xs text-center animate-pulse">ACCESS DENIED</p>}
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-zinc-800 rounded-md shadow-sm text-sm font-bold text-primary-500 bg-zinc-900 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-zinc-700 uppercase tracking-widest transition-colors mt-4"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}
