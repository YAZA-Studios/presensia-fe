import { useState } from 'react';
import { api, ApiError } from '../api';
import type { Me } from '../App';

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

  return (
    <div className="auth-wrap">
      <a href="#/" className="brand" style={{ justifyContent: 'center' }}><span className="brand-mark">✓</span> Hadirku</a>
      <form className="card auth-card" onSubmit={(e) => { void submit(e); }}>
        <h1>{mode === 'login' ? 'Masuk ke Hadirku' : 'Buat Akun Perusahaan'}</h1>
        {mode === 'login' && <p className="muted">Gunakan email & kata sandi yang terdaftar.</p>}
        {mode === 'register' && (
          <>
            <p className="muted">14 hari gratis, tanpa kartu kredit.</p>
            <label>Nama Perusahaan
              <input value={form.orgName} onChange={set('orgName')} placeholder="mis. Kopi Kenangan Takjil" required />
            </label>
            <label>Nama Anda
              <input value={form.name} onChange={set('name')} placeholder="mis. Budi Santoso" required />
            </label>
          </>
        )}
        <label>Email
          <input type="email" value={form.email} onChange={set('email')} placeholder="nama@perusahaan.id" required />
        </label>
        <label>Kata Sandi
          <input type="password" value={form.password} onChange={set('password')} placeholder="minimal 8 karakter" required minLength={8} />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar & Mulai Gratis'}
        </button>
        <p className="muted center">
          {mode === 'login'
            ? <>Belum punya akun? <a href="#/daftar">Daftar gratis</a></>
            : <>Sudah punya akun? <a href="#/masuk">Masuk</a></>}
        </p>
      </form>
    </div>
  );
}
