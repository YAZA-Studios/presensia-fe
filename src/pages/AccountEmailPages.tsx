import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, ArrowRight, Mail } from 'lucide-react';
import { api, ApiError } from '../api';
import { Logo } from '../components/Brand';

/** Bungkus kartu publik untuk alur email (verifikasi / reset sandi). */
function EmailFlowCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-wrap" style={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <main className="auth-form-side" style={{ maxWidth: 480, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div className="auth-card" style={{ width: '100%' }}>
          <Logo size={30} />
          {children}
        </div>
      </main>
    </div>
  );
}

/** Ambil query dari hash route: #/x?token=... → URLSearchParams. */
const hashQuery = (): URLSearchParams =>
  new URLSearchParams((window.location.hash || '').split('?')[1] || '');

/** ── #/lupa-password — minta tautan atur ulang kata sandi ── */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Terjadi kesalahan.');
    } finally { setBusy(false); }
  };

  return (
    <EmailFlowCard>
      <h1 style={{ marginTop: 18 }}>Lupa kata sandi?</h1>
      {sent ? (
        <>
          <div className="auth-trust" style={{ marginTop: 14 }}><Mail size={16} /> Instruksi dikirim</div>
          <p className="muted" style={{ marginTop: 12 }}>
            Jika email terdaftar, tautan pengaturan ulang kata sandi sudah dikirim ke
            <b> {email}</b> (berlaku 60 menit). Periksa juga folder spam.
          </p>
          <button className="btn btn-primary btn-block" onClick={() => { window.location.hash = '#/masuk'; }}>
            Kembali ke halaman masuk
          </button>
        </>
      ) : (
        <>
          <p className="muted">Masukkan email kerja Anda — kami kirim tautan untuk membuat kata sandi baru.</p>
          <form onSubmit={(e) => { void submit(e); }} style={{ marginTop: 14 }}>
            <label className="auth-field"><span>Email kerja</span>
              <input placeholder="nama@perusahaan.com" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? 'Memproses…' : <>Kirim Tautan Reset <ArrowRight size={16} /></>}
            </button>
          </form>
          {error && <div className="error-box">{error}</div>}
          <p className="auth-alt"><a href="#/masuk">← Kembali ke halaman masuk</a></p>
        </>
      )}
    </EmailFlowCard>
  );
}

/** ── #/verifikasi-email?token=… — konfirmasi email pendaftaran ── */
export function VerifyEmailPage() {
  const token = hashQuery().get('token') || '';
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) { if (alive) { setState('error'); setMsg('Tautan tidak valid — token tidak ditemukan.'); } return; }
      try {
        const r = await api.verifyEmail(token);
        if (!alive) return;
        setState('ok');
        setMsg(r.alreadyVerified ? 'Email ini sudah diverifikasi sebelumnya — silakan masuk.' : 'Email berhasil diverifikasi! Akun Anda kini aktif.');
      } catch (err) {
        if (!alive) return;
        setState('error');
        setMsg(err instanceof ApiError ? err.message : 'Gagal memverifikasi email.');
      }
    })();
    return () => { alive = false; };
  }, [token]);

  return (
    <EmailFlowCard>
      <h1 style={{ marginTop: 18 }}>Verifikasi email</h1>
      {state === 'loading' && <p className="muted" style={{ marginTop: 12 }}>Memeriksa tautan…</p>}
      {state === 'ok' && (
        <>
          <div className="auth-trust" style={{ marginTop: 14 }}><CheckCircle2 size={16} /> Berhasil</div>
          <p className="muted" style={{ marginTop: 12 }}>{msg}</p>
          <button className="btn btn-primary btn-block" onClick={() => { window.location.hash = '#/masuk'; }}>
            Masuk sekarang
          </button>
        </>
      )}
      {state === 'error' && (
        <>
          <div className="error-box" style={{ marginTop: 14 }}><AlertTriangle size={14} style={{ verticalAlign: '-2px' }} /> {msg}</div>
          <p className="muted small" style={{ marginTop: 10 }}>
            Tautan kedaluwarsa? Dari halaman masuk, coba masuk lalu klik "kirim ulang email verifikasi".
          </p>
          <button className="btn btn-primary btn-block" onClick={() => { window.location.hash = '#/masuk'; }}>
            Ke halaman masuk
          </button>
        </>
      )}
    </EmailFlowCard>
  );
}

/** ── #/atur-ulang-sandi?token=… — buat kata sandi baru dari tautan email ── */
export function ResetPasswordPage() {
  const token = hashQuery().get('token') || '';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    if (pw.length < 8) { setError('Kata sandi minimal 8 karakter.'); return; }
    if (pw !== pw2) { setError('Konfirmasi kata sandi tidak sama.'); return; }
    setBusy(true);
    try {
      await api.resetPassword(token, pw);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Terjadi kesalahan.');
    } finally { setBusy(false); }
  };

  return (
    <EmailFlowCard>
      <h1 style={{ marginTop: 18 }}>Atur ulang kata sandi</h1>
      {done ? (
        <>
          <div className="auth-trust" style={{ marginTop: 14 }}><CheckCircle2 size={16} /> Kata sandi diperbarui</div>
          <p className="muted" style={{ marginTop: 12 }}>Kata sandi baru sudah aktif. Email terverifikasi otomatis — silakan masuk.</p>
          <button className="btn btn-primary btn-block" onClick={() => { window.location.hash = '#/masuk'; }}>
            Masuk sekarang
          </button>
        </>
      ) : (
        <>
          <p className="muted">Buat kata sandi baru untuk akun Anda.</p>
          <form onSubmit={(e) => { void submit(e); }} style={{ marginTop: 14 }}>
            <label className="auth-field"><span>Kata sandi baru</span>
              <input placeholder="Minimal 8 karakter" type="password" value={pw} minLength={8}
                onChange={(e) => setPw(e.target.value)} required />
            </label>
            <label className="auth-field"><span>Ulangi kata sandi baru</span>
              <input placeholder="Ulangi kata sandi" type="password" value={pw2} minLength={8}
                onChange={(e) => setPw2(e.target.value)} required />
            </label>
            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? 'Menyimpan…' : <>Simpan Kata Sandi Baru <ArrowRight size={16} /></>}
            </button>
          </form>
          {error && <div className="error-box">{error}</div>}
          <p className="auth-alt"><a href="#/lupa-password">Tautan kedaluwarsa? Ajukan ulang</a></p>
        </>
      )}
    </EmailFlowCard>
  );
}
