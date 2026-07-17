import { useState, useEffect } from 'react';
import GateKeeper from './components/GateKeeper';
import Terminal from './components/Terminal';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem('evos_auth');
    setIsAuthenticated(auth === 'true');

    const theme = localStorage.getItem('evos_theme');
    if (theme && ['purple', 'amber'].includes(theme)) {
      document.documentElement.className = `theme-${theme}`;
    } else {
      document.documentElement.className = '';
    }
  }, []);

  if (isAuthenticated === null) {
    return <div className="h-[100dvh] w-full bg-black"></div>; // Loading state
  }

  return (
    <>
      {isAuthenticated ? (
        <Terminal onLogout={() => setIsAuthenticated(false)} />
      ) : (
        <GateKeeper onUnlock={() => setIsAuthenticated(true)} />
      )}
    </>
  );
}
