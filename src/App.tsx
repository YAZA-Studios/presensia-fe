import { useEffect, useState, useCallback } from 'react';
import { api } from './api';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';

export interface Me { email: string; name: string; role: string; org: { name: string; plan: string; planExpiresAt: string | null } }

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [route, setRoute] = useState(window.location.hash || '#/');
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const onHash = (): void => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const refresh = useCallback(async () => {
    try { setMe(await api.me() as Me); } catch { setMe(null); } finally { setBooting(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  if (booting) {
    return <div className="boot"><div className="spinner" /></div>;
  }

  const isHash = (h: string): boolean => route.startsWith(h);

  if (!me) {
    if (isHash('#/masuk') || isHash('#/daftar')) {
      return <AuthPage mode={isHash('#/daftar') ? 'register' : 'login'} onAuthed={(m) => { setMe(m as Me); window.location.hash = '#/app'; }} />;
    }
    return <LandingPage />;
  }

  return (
    <Dashboard
      me={me}
      onLogout={async () => { await api.logout(); setMe(null); window.location.hash = '#/'; }}
      refreshMe={refresh}
    />
  );
}
