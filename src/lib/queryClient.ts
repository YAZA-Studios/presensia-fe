import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient Presensia — aturan cache disetel untuk konteks absensi:
 *  - Data read-only (riwayat, karyawan, policy) boleh tampil basi sekejap → staleTime 30 dtk
 *    menghemat request D1 dan membuat navigasi antar tab instan.
 *  - Setelah gagal → tidak retry agresif (4xx memang tidak akan berubah).
 *  - Refetch saat kembali online & saat window fokus kembali.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 30 * 60_000,
      retry: (failureCount, error) => {
        const status = (error as { status?: number }).status ?? 0;
        if (status >= 400 && status < 500) return false; // error klien: ulang percuma
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: { retry: false },
  },
});
