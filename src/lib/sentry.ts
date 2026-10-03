// Sentry — error monitoring (off secara default; aktif dengan VITE_SENTRY_DSN).
// Set DSN via .env.local produksi atau env var Cloudflare Pages.
// Tanpa DSN: library tetap ter-load (agar kode tidak bercabang) tapi tidak mengirim apa pun.
import * as Sentry from '@sentry/react';

export const initSentry = (): void => {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    // Sampling produksi hemat: error 100%, tracing ringan.
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1,
    beforeSend(event) {
      // Jangan pernah kirim isi selfie/kredensial ke pihak ketiga.
      if (event.request?.data && typeof event.request.data === 'object') {
        const d = event.request.data as Record<string, unknown>;
        if ('selfie' in d) d.selfie = '[redacted]';
        if ('password' in d) d.password = '[redacted]';
      }
      return event;
    },
  });
};
