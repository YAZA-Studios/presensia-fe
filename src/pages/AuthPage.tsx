import { useState } from 'react';
import { ShieldCheck, MapPin, Timer, FileSpreadsheet, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '../api';
import { Logo } from '../components/Brand';

export default function AuthPage({ mode, onAuthed }: {
  mode: 'login' | 'register'; onAuthed: (me: unknown) => void;
}) {
  const isReg = mode === 'register';
  const [form, setForm] = useState({ orgName: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    if (isReg && !acceptedTerms) { setError('Setujui Terms of Service dan Privacy Policy untuk melanjutkan.'); return; }
    if (form.password.length < 8) { setError('Kata sandi harus memiliki minimal 8 karakter.'); return; }
    setBusy(true);
    try {
      const me = isReg
        ? await api.register(form)
        : await api.login({ email: form.email, password: form.password });
      onAuthed(me);
      window.location.hash = '#/app';
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Terjadi kesalahan.');
    } finally { setBusy(false); }
  };

  const google = (): void => {
    const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '');
    window.location.href = `${apiBase}/auth/google`;
  };

  return (
    <div className="auth-wrap">
      <aside className="auth-side">
        <Logo size={30} dark />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2>Precision. Presence.<br />World-Class Attendance.</h2>
          <p>Absensi GPS dengan geofencing ketat, selfie berkode anti-titip-absen, approval cuti berjenjang, dan ekspor payroll siap pakai.</p>
        </div>
        <div className="auth-points">
          <div className="auth-point"><MapPin size={17} /> Geofencing + validasi akurasi anti fake-GPS</div>
          <div className="auth-point"><ShieldCheck size={17} /> Kode verifikasi selfie — titip absen otomatis gagal</div>
          <div className="auth-point"><Timer size={17} /> Shift lintas tengah malam &amp; lembur terhitung otomatis</div>
          <div className="auth-point"><FileSpreadsheet size={17} /> Rekap &amp; timesheet payroll siap unduh</div>
        </div>
      </aside>

      <main className="auth-form-side">
        <div className="auth-card">
          <Logo size={30} />
          <h1 style={{ marginTop: 18 }}>{isReg ? 'Buat akun perusahaan' : 'Selamat datang kembali'}</h1>
          <p className="muted">{isReg ? 'Gratis 14 hari. Tanpa kartu kredit.' : 'Masuk untuk melanjutkan ke dashboard.'}</p>
          <div className="auth-trust"><CheckCircle2 size={16} /> Data terenkripsi dan aman</div>

          <button type="button" className="btn-google" onClick={google} style={{ marginTop: 18 }}>
            <GoogleG /> {isReg ? 'Daftar dengan Google' : 'Masuk dengan Google'}
          </button>
          <div className="divider">atau gunakan email</div>

          <form onSubmit={(e) => { void submit(e); }}>
            {isReg && (
              <>
                <label className="auth-field"><span>Nama perusahaan</span><input placeholder="Contoh: Presensia Indonesia" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} required /></label>
                <label className="auth-field"><span>Nama Anda</span><input placeholder="Nama lengkap" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              </>
            )}
            <label className="auth-field"><span>Email kerja</span><input placeholder="nama@perusahaan.com" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <label className="auth-field"><span>Kata sandi</span><div className="password-wrap"><input placeholder="Minimal 8 karakter" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} /><button type="button" className="password-toggle" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {!isReg && <div className="auth-help"><span>Gunakan akun terdaftar Anda</span><a href="#/lupa-password">Lupa password?</a></div>}
            {isReg && <label className="auth-terms"><input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} required /><span>Saya setuju dengan <a href="#/terms">Terms of Service</a> dan <a href="#/privacy">Privacy Policy</a>.</span></label>}
            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? 'Memproses…' : <>{isReg ? 'Mulai Sekarang' : 'Masuk'} <ArrowRight size={16} /></>}
            </button>
          </form>
          {error && <div className="error-box">{error}</div>}
          <p className="auth-alt">
            {isReg
              ? <>Sudah punya akun? <a href="#/masuk">Masuk</a></>
              : <>Belum punya akun? <a href="#/daftar">Daftar gratis</a></>}
          </p>
        </div>
      </main>
    </div>
  );
}

function GoogleG(): React.ReactNode {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}
