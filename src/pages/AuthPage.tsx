import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api, ApiError } from '../api';
import type { Me } from '../App';

const GoogleIcon = (): React.ReactElement => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"/>
    <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"/>
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"/>
  </svg>
);

export default function AuthPage({ mode, onAuthed }: { mode: 'login' | 'register'; onAuthed: (me: Me) => void }) {
  const [form, setForm] = useState({ orgName: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = mode === 'login'
        ? await api.login({ email: form.email, password: form.password })
        : await api.register(form);
      onAuthed(res as unknown as Me);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal terhubung ke server.');
    } finally { setBusy(false); }
  };

  const googleLogin = (): void => {
    const base = import.meta.env.VITE_API_URL || '/api';
    window.location.href = `${base}/auth/google`;
  };

  return (
    <div className="auth-wrap">
      <a href="#/" className="brand" style={{ justifyContent: 'center' }}><span className="brand-mark">P</span> Presensia</a>
      <div className="card auth-card">
        <div className="auth-head">
          <h1>{mode === 'login' ? 'Selamat Datang Kembali' : 'Buat Akun Perusahaan'}</h1>
          <p className="muted">{mode === 'login' ? 'Masuk untuk melanjutkan ke dashboard absensi.' : '14 hari gratis penuh fitur — tanpa kartu kredit.'}</p>
        </div>

        <button type="button" className="btn btn-google" onClick={googleLogin}>
          <GoogleIcon /> Lanjutkan dengan Google
        </button>
        <div className="divider"><span>atau gunakan email</span></div>

        <form onSubmit={(e) => { void submit(e); }}>
          {mode === 'register' && (
            <>
              <label>Nama Perusahaan
                <input value={form.orgName} onChange={set('orgName')} placeholder="mis. PT Maju Terus" required />
              </label>
              <label>Nama Anda
                <input value={form.name} onChange={set('name')} placeholder="mis. Budi Santoso" required />
              </label>
            </>
          )}
          <label>Email Kerja
            <input type="email" value={form.email} onChange={set('email')} placeholder="nama@perusahaan.id" required />
          </label>
          <label>Kata Sandi
            <input type="password" value={form.password} onChange={set('password')} placeholder="minimal 8 karakter" required minLength={8} />
          </label>
          {error && <div className="error-box">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={busy} type="submit">
            {busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar & Mulai Gratis'} <ArrowRight size={15} />
          </button>
        </form>

        <p className="muted center switch-auth">
          {mode === 'login'
            ? <>Belum punya akun? <a href="#/daftar">Daftar gratis</a></>
            : <>Sudah punya akun? <a href="#/masuk">Masuk</a></>}
        </p>
      </div>
      <p className="muted center tiny">Dengan mendaftar, Anda menyetujui Syarat Layanan & Kebijakan Privasi Presensia.</p>
    </div>
  );
}
