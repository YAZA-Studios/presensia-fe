import { useEffect, useRef, useState } from 'react';
import { Camera, MapPin, RefreshCw, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
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

interface Challenge { nonce: string; code: string; expiresInSeconds: number }

export default function ClockCard({ me, sites, onClocked }: {
  me: Me; sites: Site[]; onClocked: () => Promise<void>;
}) {
  const [today, setToday] = useState<{ clockInAt: string | null; clockOutAt: string | null; status: string } | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(true);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [chalError, setChalError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadToday = (): void => { api.today().then((r) => setToday(r.attendance)).catch(() => {}); };
  useEffect(() => { loadToday(); }, []);

  useEffect(() => {
    if (!navigator.geolocation) { setGpsBusy(false); setMessage({ ok: false, text: 'Perangkat tidak mendukung GPS.' }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? 0 }); setGpsBusy(false); },
      () => { setGpsBusy(false); setMessage({ ok: false, text: 'Izin lokasi diperlukan untuk absen.' }); },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }, []);

  // Minta challenge ke server saat kamera dibuka — kode 6 digit harus
  // terlihat BERSAMA wajah di selfie (mencegah foto lama / titip absen).
  const openCamera = async (): Promise<void> => {
    setChalError('');
    try {
      setChallenge(await api.challenge());
      fileRef.current?.click();
    } catch (err) {
      setChalError(err instanceof ApiError ? err.message : 'Gagal membuat kode verifikasi.');
    }
  };

  const pickSelfie = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !challenge) return;
    try { setSelfie(await compressImage(file)); } catch { setMessage({ ok: false, text: 'Gagal memproses foto.' }); }
  };

  const doClock = async (kind: 'in' | 'out'): Promise<void> => {
    if (!coords || !selfie || !challenge) return;
    setBusy(true); setMessage(null);
    try {
      const res = await api.clock({
        lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy,
        selfie, kind, nonce: challenge.nonce,
      });
      setMessage({ ok: true, text: `${kind === 'in' ? 'Clock-in' : 'Clock-out'} berhasil di ${res.site} (${res.distM} m dari lokasi).` });
      setSelfie(null); setChallenge(null);
      loadToday();
      void onClocked();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Gagal mengirim absensi.' });
      setSelfie(null); setChallenge(null);
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
            : coords ? <>GPS terkunci (±{Math.round(coords.accuracy)} m){coords.accuracy > 100 && <span className="text-danger"> — akurasi rendah, absen bisa ditandai server</span>}</>
            : <span className="text-danger">Lokasi tidak tersedia — izinkan akses lokasi.</span>}
          {!gpsBusy && <button className="btn btn-ghost btn-sm" onClick={() => window.location.reload()}><RefreshCw size={12} /> Ulangi</button>}
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="user" hidden
          onChange={(e) => { void pickSelfie(e); }} />
        {selfie && challenge ? (
          <div className="challenge-live">
            <div className="challenge-code">{challenge.code}</div>
            <img src={selfie} alt="selfie" className="selfie-preview" />
            <p className="muted small"><ShieldCheck size={12} /> Pastikan kode ini terlihat bersama wajah Anda di foto.</p>
          </div>
        ) : (
          <button className="selfie-btn" onClick={() => { void openCamera(); }} disabled={!!done || !!chalError}>
            <><Camera size={22} /><span>{done ? 'Absensi hari ini selesai' : 'Ambil Selfie + Kode Verifikasi'}</span></>
          </button>
        )}
        {chalError && <div className="error-box">{chalError}</div>}

        <div className="clock-actions">
          <button className="btn btn-primary btn-lg" disabled={busy || !coords || !selfie || !challenge || !!today?.clockInAt || !!done}
            onClick={() => { void doClock('in'); }}>
            {busy ? 'Mengirim…' : 'Clock In'}
          </button>
          <button className="btn btn-secondary btn-lg" disabled={busy || !coords || !selfie || !challenge || !today?.clockInAt || !!today?.clockOutAt}
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
          <li><strong>Kode verifikasi</strong> muncul saat selfie — foto lama atau titip absen otomatis gagal.</li>
          <li>Terlambat dihitung otomatis dari shift + masa tenggang.</li>
        </ul>
        <p className="muted">Login sebagai <strong>{me.email}</strong></p>
      </aside>
    </div>
  );
}
