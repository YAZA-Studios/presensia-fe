// Offline indicator — banner global saat koneksi hilang.
import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = (): void => setOnline(true);
    const down = (): void => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      Mode offline — tampilan yang sudah dibuka masih tersedia. Memuat data dan mencatat absensi membutuhkan internet.
    </div>
  );
}
