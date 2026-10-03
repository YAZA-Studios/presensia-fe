import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, MapPin, RefreshCw, CheckCircle2, Clock, ShieldCheck, X, SwitchCamera } from 'lucide-react';
import { api, ApiError, type Site } from '../api';
import type { Me } from '../App';

interface Challenge { nonce: string; code: string; expiresInSeconds: number }

export default function ClockCard({ me, sites, onClocked }: {
  me: Me; sites: Site[]; onClocked: () => Promise<void>;
}) {
  const qc = useQueryClient();
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(true);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Kamera live ──
  const [camOpen, setCamOpen] = useState(false);
  const [camError, setCamError] = useState('');
  const [selfie, setSelfie] = useState<string | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [canFlip, setCanFlip] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chalAtRef = useRef(0);

  // Status hari ini via TanStack Query — di-invalidate setelah clock sukses.
  const { data: todayData } = useQuery({ queryKey: ['today'], queryFn: () => api.today() });
  const today = todayData?.attendance ?? null;

  useEffect(() => {
    if (!navigator.geolocation) { setGpsBusy(false); setMessage({ ok: false, text: 'Perangkat tidak mendukung GPS.' }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? 0 }); setGpsBusy(false); },
      () => { setGpsBusy(false); setMessage({ ok: false, text: 'Izin lokasi diperlukan untuk absen.' }); },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }, []);

  const stopCamera = (): void => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOpen(false);
  };

  // Matikan kamera saat komponen dibongkar (pindah tab, logout, dst).
  useEffect(() => () => stopCamera(), []);

  // Challenge 6 digit dari server — berlaku 90 detik & sekali pakai.
  // Diperbarui otomatis bila yang lama sudah > 60 detik.
  const ensureChallenge = async (): Promise<Challenge> => {
    if (challenge && Date.now() - chalAtRef.current < 60_000) return challenge;
    const chal = await api.challenge();
    chalAtRef.current = Date.now();
    setChallenge(chal);
    return chal;
  };

  const startCamera = async (mode: 'user' | 'environment' = facing): Promise<void> => {
    setCamError('');
    try {
      await ensureChallenge();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setFacing(mode);
      setCamOpen(true);
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCanFlip(devices.filter((d) => d.kind === 'videoinput').length > 1);
      } catch { setCanFlip(false); }
    } catch {
      setCamError('Kamera wajib untuk absen — izinkan akses kamera di browser lalu coba lagi. Foto dari galeri tidak diterima.');
    }
  };

  // Sambungkan stream ke elemen <video> begitu preview muncul.
  useEffect(() => {
    if (camOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => {});
    }
  }, [camOpen]);

  const flip = (): void => {
    const next = facing === 'user' ? 'environment' : 'user';
    streamRef.current?.getTracks().forEach((t) => t.stop());
    void startCamera(next);
  };

  /** Jepret: tangkap frame kamera + STEMPEL kode verifikasi & waktu ke foto.
   *  Kode tercetak di foto = bukti foto diambil SAAT challenge itu (anti foto lama). */
  const capture = (): void => {
    const v = videoRef.current;
    if (!v || !challenge || !v.videoWidth) return;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight));
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.save();
    if (facing === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    // Stempel (tidak ikut termirror): kode besar + waktu, sudut bawah.
    const pad = Math.round(canvas.width * 0.03);
    const fs = Math.max(20, Math.round(canvas.width * 0.06));
    const label = `KODE ${challenge.code}`;
    const ts = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    ctx.font = `bold ${fs}px system-ui, sans-serif`;
    const tw = ctx.measureText(label).width;
    const boxH = fs * 2.4;
    const y = canvas.height - pad - boxH;
    ctx.fillStyle = 'rgba(15,23,42,0.78)';
    ctx.fillRect(pad - 10, y, tw + 20, boxH);
    ctx.fillStyle = '#5EEAD4';
    ctx.fillText(label, pad, y + fs * 1.1);
    ctx.font = `500 ${Math.round(fs * 0.5)}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(`Presensia · ${ts}`, pad, y + fs * 1.95);
    setSelfie(canvas.toDataURL('image/jpeg', 0.72));
    stopCamera();
  };

  const retake = (): void => {
    setSelfie(null);
    void startCamera();
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
      void qc.invalidateQueries({ queryKey: ['today'] });
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

        {selfie && challenge ? (
          <div className="challenge-live">
            <div className="challenge-code">{challenge.code}</div>
            <img src={selfie} alt="selfie" className="selfie-preview" />
            <p className="muted small"><ShieldCheck size={12} /> Kode & waktu sudah tercetak di foto — bukti selfie diambil saat ini.</p>
            <button className="btn btn-ghost btn-sm" onClick={retake}><RefreshCw size={12} /> Ambil ulang</button>
          </div>
        ) : camOpen ? (
          <div className="cam-live">
            <video ref={videoRef} playsInline muted autoPlay className={facing === 'user' ? 'mirror' : ''} />
            <div className="cam-code">
              <ShieldCheck size={15} />
              <strong>{challenge?.code}</strong>
              <span>berlaku 90 dtk · tercetak otomatis di foto</span>
            </div>
            <div className="cam-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => stopCamera()}><X size={14} /> Batal</button>
              <button className="btn btn-primary" onClick={capture}><Camera size={16} /> Jepret</button>
              {canFlip && <button className="btn btn-ghost btn-sm" onClick={flip}><SwitchCamera size={14} /></button>}
            </div>
          </div>
        ) : (
          <button className="selfie-btn" onClick={() => { void startCamera(); }} disabled={!!done}>
            <><Camera size={22} /><span>{done ? 'Absensi hari ini selesai' : 'Ambil Selfie + Kode Verifikasi'}</span></>
          </button>
        )}
        {camError && <div className="error-box">{camError}</div>}

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
          <li>Aktifkan izin lokasi &amp; kamera browser.</li>
          <li>Absen harus dalam radius lokasi kantor — server memverifikasi jarak, bukan ponsel.</li>
          <li><strong>Kamera wajib</strong> — absen hanya bisa dengan selfie langsung dari kamera, bukan foto galeri.</li>
          <li><strong>Kode verifikasi</strong> muncul di kamera &amp; tercetak di selfie — foto lama atau titip absen otomatis gagal.</li>
          <li>Terlambat dihitung otomatis dari shift + masa tenggang.</li>
        </ul>
        <p className="muted">Login sebagai <strong>{me.email}</strong></p>
      </aside>
    </div>
  );
}
