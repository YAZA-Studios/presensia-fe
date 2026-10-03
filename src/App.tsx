import { useCallback, useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient as QC } from '@tanstack/react-query';
import { api } from './api';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import { ForgotPasswordPage, VerifyEmailPage, ResetPasswordPage } from './pages/AccountEmailPages';
import Dashboard from './pages/Dashboard';
import OfflineBanner from './components/OfflineBanner';
import { clearPrivateState, SESSION_ENDED_EVENT } from './lib/privateCache';

export interface Me { email: string; name: string; role: string; org: { name: string; plan: string; planExpiresAt: string | null } }

export default function App({ queryClient }: { queryClient: QC }) {
  const [me, setMe] = useState<Me | null>(null);
  const [route, setRoute] = useState(window.location.hash || '#/');
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const onSessionEnded = () => {
      clearPrivateState(queryClient);
      setMe(null);
    };
    window.addEventListener(SESSION_ENDED_EVENT, onSessionEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onSessionEnded);
  }, [queryClient]);

  useEffect(() => {
    const onHash = (): void => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const refresh = useCallback(async () => {
    // Callback OAuth Google: API redirect ke #/auth/callback?code=... —
    // tukar kode sekali-pakai menjadi sesi (token disimpan di localStorage).
    const cb = (window.location.hash || '#/').match(/^#\/auth\/callback\?code=([^&]+)/);
    if (cb) {
      try {
        const me = await api.exchange(decodeURIComponent(cb[1]!)) as unknown as Me;
        clearPrivateState(queryClient);
        setMe(me);
        window.location.hash = '#/app';
      } catch {
        setMe(null);
        window.location.hash = '#/masuk';
      } finally { setBooting(false); }
      return;
    }
    try { setMe(await api.me() as Me); } catch { setMe(null); } finally { setBooting(false); }
  }, [queryClient]);
  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'presensia_token' && event.key !== null) return;
      clearPrivateState(queryClient);
      setMe(null);
      void refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [queryClient, refresh]);

  if (booting) {
    return <div className="boot"><div className="spinner" /></div>;
  }

  const isHash = (h: string): boolean => route.startsWith(h);

  if (!me) {
    // Alur email publik: verifikasi pendaftaran, lupa & atur ulang sandi.
    if (isHash('#/verifikasi-email')) return <VerifyEmailPage />;
    if (isHash('#/atur-ulang-sandi')) return <ResetPasswordPage />;
    if (isHash('#/lupa-password')) return <ForgotPasswordPage />;
    if (isHash('#/masuk') || isHash('#/daftar')) {
      return <AuthPage mode={isHash('#/daftar') ? 'register' : 'login'} onAuthed={(m) => { clearPrivateState(queryClient); setMe(m as Me); window.location.hash = '#/app'; }} />;
    }
    return <LandingPage />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <OfflineBanner />
      <Dashboard
        me={me}
        onLogout={async () => { await api.logout(); setMe(null); window.location.hash = '#/'; }}
        refreshMe={refresh}
      />
    </QueryClientProvider>
  );
}
