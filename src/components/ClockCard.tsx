import { useEffect, useRef, useState } from 'react';
import { Camera, MapPin, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { api, ApiError, type Site } from '../api';
import type { Me } from '../App';

const compressImage = (file: File, maxSide = 720, quality = 0.72): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });

export default function ClockCard({ me, sites, onClocked }: {
  me: Me; sites: Site[]; onClocked: () => Promise<void>;
}) {
  const [today, setToday] = useState<{ clockInAt: string | null; clockOutAt: string | null; status: string } | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadToday = (): void => { api.today().then((r) => setToday(r.attendance)).catch(() => {}); };
  useEffect(() => { loadToday(); }, []);

  useEffect(() => {
    if (!navigator.geolocation) { setGpsBusy(false); setMessage({ ok: false, text: 'Perangkat tidak mendukung GPS.' }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsBusy(false); },
      () => { setGpsBusy(false); setMessage({ ok: false, text: 'Izin lokasi diperlukan untuk absen.' }); },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }, []);

  const pickSelfie = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setSelfie(await compressImage(file)); } catch { setMessage({ ok: false, text: 'Gagal memproses foto.' }); }
  };

  const doClock = async (kind: 'in' | 'out'): Promise<void> => {
    if (!coords || !selfie) return;
    setBusy(true); setMessage(null);
    try {
      const res = await api.clock({ lat: coords.lat, lng: coords.lng, selfie, kind });
      setMessage({ ok: true, text: `${kind === 'in' ? 'Clock-in' : 'Clock-out'} berhasil di ${res.site} (${res.distM} m dari lokasi).` });
      setSelfie(null);
      loadToday();
      void onClocked();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Gagal mengirim absensi.' });
    } finally { setBusy(false); }
  };

  const done = today?.clockInAt && today.clockOutAt;

  return (
    <div className="clock-grid">
      <div className="card clock-card">
        <h2><Clock size={20} /> Absen Hari Ini</h2>
        <div className="clock-state">
          <div className={`state-chip ${today?.clockInAt ? 'state-ok' : ''}`}>
            <CheckCircle2 size={16} /> Clock-in: {today?.clockInAt ? new Date(today.clockInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
          </div>
          <div className={`state-chip ${today?.clockOutAt ? 'state-ok' : ''}`}>
            <CheckCircle2 size={16} /> Clock-out: {today?.clockOutAt ? new Date(today.clockOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
          </div>
        </div>
        {today?.status && <span className={`badge status-${today.status}`}>{today.status === 'late' ? 'Terlambat' : today.status === 'present' ? 'Tepat Waktu' : today.status}</span>}

        <div className="gps-row">
          <MapPin size={15} />
          {gpsBusy ? <>Mencari satelit GPS…</>
            : coords ? <>GPS terkunci ({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)})</>
            : <span className="text-danger">Lokasi tidak tersedia — izinkan akses lokasi.</span>}
          {!gpsBusy && <button className="btn btn-ghost btn-sm" onClick={() => window.location.reload()}><RefreshCw size={12} /> Ulangi</button>}
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="user" hidden
          onChange={(e) => { void pickSelfie(e); }} />
        <button className="selfie-btn" onClick={() => fileRef.current?.click()} disabled={!!done}>
          {selfie
            ? <img src={selfie} alt="selfie" className="selfie-preview" />
            : <><Camera size={22} /><span>{done ? 'Absensi hari ini selesai' : 'Ambil Selfie'}</span></>}
        </button>

        <div className="clock-actions">
          <button className="btn btn-primary btn-lg" disabled={busy || !coords || !selfie || !!today?.clockInAt || !!done}
            onClick={() => { void doClock('in'); }}>
            {busy ? 'Mengirim…' : 'Clock In'}
          </button>
          <button className="btn btn-secondary btn-lg" disabled={busy || !coords || !selfie || !today?.clockInAt || !!today?.clockOutAt}
            onClick={() => { void doClock('out'); }}>
            Clock Out
          </button>
        </div>
        {message && <div className={message.ok ? 'ok-box' : 'error-box'}>{message.text}</div>}
        {sites.length === 0 && <p className="muted">Belum ada lokasi absen terdaftar. Minta admin menambahkan lokasi kantor.</p>}
      </div>

      <aside className="card side-card">
        <h3>Tips Absensi Lancar</h3>
        <ul className="tips">
          <li>Aktifkan izin lokasi & kamera browser.</li>
          <li>Absen harus dalam radius lokasi kantor — server memverifikasi jarak, bukan ponsel.</li>
          <li>Selfie wajib — sistem mencegah titip absen.</li>
          <li>Terlambat dihitung otomatis dari shift + masa tenggang.</li>
        </ul>
        <p className="muted">Login sebagai <strong>{me.email}</strong></p>
      </aside>
    </div>
  );
}
