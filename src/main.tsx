import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { initSentry } from './lib/sentry';
import { queryClient } from './lib/queryClient';
import { registerSW } from 'virtual:pwa-register';
import { removeLegacyApiCache } from './lib/privateCache';

// Error monitoring (aktif hanya bila VITE_SENTRY_DSN di-set).
initSentry();

// Service worker PWA — auto update, aset app shell tersimpan offline.
registerSW({ immediate: true });
void removeLegacyApiCache().catch(() => { /* Storage may be disabled. */ });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App queryClient={queryClient} />
  </StrictMode>,
);
