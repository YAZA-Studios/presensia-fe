import { useEffect, useState } from 'react';
import { MapPin, Camera, Clock, FileBarChart, ShieldCheck, Check, Smartphone } from 'lucide-react';
import { api, type Plan } from '../api';

const rupiah = (n: number): string => `Rp ${n.toLocaleString('id-ID')}`;

export default function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  useEffect(() => { api.plans().then((r) => setPlans(r.plans)).catch(() => {}); }, []);

  return (
    <div className="landing">
      <header className="nav">
        <div className="brand"><span className="brand-mark">✓</span> Hadirku</div>
        <nav>
          <a href="#fitur">Fitur</a>
          <a href="#harga">Harga</a>
          <a className="btn btn-ghost" href="#/masuk">Masuk</a>
          <a className="btn btn-primary" href="#/daftar">Coba Gratis 14 Hari</a>
        </nav>
      </header>

      <section className="hero">
        <span className="pill">Absensi GPS + Selfie · Rekap Otomatis</span>
        <h1>Karyawan Hadir Tepat,<br />Admin Tidak Pusing.</h1>
        <p className="lead">
          Hadirku mencatat kehadiran lewat <strong>lokasi GPS + selfie</strong> dengan geofencing.
          Telat, izin, dan rekap bulanan tersusun otomatis — tanpa buku absensi, tanpa titip absen.
        </p>
        <div className="hero-cta">
          <a className="btn btn-primary btn-lg" href="#/daftar">Mulai Gratis 14 Hari</a>
          <a className="btn btn-ghost btn-lg" href="#fitur">Lihat Fitur ↓</a>
        </div>
        <div className="hero-points">
          <span><MapPin size={15} /> Geofencing radius</span>
          <span><Camera size={15} /> Selfie wajib</span>
          <span><Clock size={15} /> Telat terhitung otomatis</span>
        </div>
      </section>

      <section id="fitur" className="features">
        <h2>Semua yang Dibutuhkan Tim Lapangan & Kantoran</h2>
        <div className="feature-grid">
          <div className="feature"><MapPin size={22} /><h3>Geofencing GPS</h3><p>Absen hanya bisa di radius lokasi kerja. Di luar radius? Server menolak — bukan cuma disembunyikan.</p></div>
          <div className="feature"><Camera size={22} /><h3>Selfie Anti Titip Absen</h3><p>Setiap clock-in/out wajib selfie, tersimpan aman di storage Cloudflare.</p></div>
          <div className="feature"><Clock size={22} /><h3>Shift & Toleransi Telat</h3><p>Atur jam kerja per tim, batas telat dihitung server dari shift masing-masing.</p></div>
          <div className="feature"><FileBarChart size={22} /><h3>Izin & Rekap Otomatis</h3><p>Cuti/izin/sakit diajukan dari ponsel; disetujui admin langsung masuk rekap.</p></div>
          <div className="feature"><Smartphone size={22} /><h3>Cukup Ponsel</h3><p>Tanpa mesin fingerprint, tanpa instalasi. Semua dari browser kamera ponsel.</p></div>
          <div className="feature"><ShieldCheck size={22} /><h3>Infrastruktur Cloudflare</h3><p>Cepat di seluruh Indonesia & dunia, dengan audit log dan pembayaran DOKU resmi.</p></div>
        </div>
      </section>

      <section id="harga" className="pricing">
        <h2>Harga Jujur, Bayar via DOKU</h2>
        <p className="lead">Mulai 14 hari gratis tanpa kartu kredit.Upgrade kapan saja — QRIS, VA, e-wallet.</p>
        <div className="plan-grid">
          {plans.map((p) => (
            <div key={p.id} className={`plan ${p.months >= 12 ? 'plan-best' : ''}`}>
              {p.months >= 12 && <span className="plan-badge">HEMAT</span>}
              <h3>{p.name}</h3>
              <div className="plan-price">{rupiah(p.price)}<small> /{p.months >= 12 ? 'tahun' : 'bulan'}</small></div>
              <ul>
                <li><Check size={15} /> Hingga {p.employeeQuota} karyawan</li>
                <li><Check size={15} /> Clock-in GPS + selfie</li>
                <li><Check size={15} /> Izin & rekap otomatis</li>
                <li><Check size={15} /> Dukungan prioritas</li>
              </ul>
              <a className="btn btn-primary" href="#/daftar">Mulai Sekarang</a>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <span>© {new Date().getFullYear()} Hadirku — absensi karyawan modern. Dibangun di Cloudflare.</span>
      </footer>
    </div>
  );
}
