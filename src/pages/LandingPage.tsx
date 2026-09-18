import { useEffect, useState } from 'react';
import { MapPin, Camera, Clock, FileBarChart, ShieldCheck, Check, Globe2, BellRing, Download, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api, type Plan } from '../api';

const rupiah = (n: number): string => `Rp ${n.toLocaleString('id-ID')}`;

const FEATURES = [
  { icon: MapPin, title: 'Geofencing GPS Presisi', desc: 'Absen hanya diterima dalam radius kantor — jarak diverifikasi server dengan rumus haversine, bukan dipercaya dari ponsel.' },
  { icon: Camera, title: 'Selfie Anti Titip Absen', desc: 'Setiap clock-in & clock-out wajib selfie. Tersimpan terenkripsi di storage Cloudflare R2, hanya bisa dilihat org sendiri.' },
  { icon: Clock, title: 'Shift & Toleransi Telat', desc: 'Jam kerja per tim dengan masa tenggang. Status terlambat dihitung otomatis oleh server dari shift masing-masing karyawan.' },
  { icon: FileBarChart, title: 'Dashboard Analitik Realtime', desc: 'KPI harian, tren 7 hari, dan daftar karyawan paling sering telat — semua tampil dalam dashboard yang mudah dibaca.' },
  { icon: Download, title: 'Ekspor Excel/CSV Sekali Klik', desc: 'Rekap bulanan siap unduh dalam format CSV — langsung rapi dibuka di Excel, Google Sheets, atau Numbers.' },
  { icon: BellRing, title: 'Izin, Cuti & Sakit Online', desc: 'Pengajuan dari ponsel karyawan, persetujuan sekali klik dari admin. Disetujui = langsung masuk rekap, tanpa catatan manual.' },
  { icon: Globe2, title: 'Infrastruktur Global Cloudflare', desc: 'Berjalan di 300+ lokasi edge dunia. Cepat dari Sabang sampai Merauke, dengan uptime kelas enterprise.' },
  { icon: ShieldCheck, title: 'Keamanan Berlapis', desc: 'PBKDF2 300 ribu iterasi, sesi cookie bertanda tangan HMAC, rate limiting, audit log, dan pembayaran DOKU resmi.' },
];

export default function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  useEffect(() => { api.plans().then((r) => setPlans(r.plans)).catch(() => {}); }, []);

  return (
    <div className="landing">
      <header className="nav">
        <div className="brand"><span className="brand-mark">P</span> Presensia</div>
        <nav>
          <a href="#fitur">Fitur</a>
          <a href="#harga">Harga</a>
          <a className="btn btn-ghost" href="#/masuk">Masuk</a>
          <a className="btn btn-primary" href="#/daftar">Coba Gratis 14 Hari</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-badge"><Sparkles size={14} /> Platform absensi generasi baru</div>
        <h1>Absensi Karyawan yang<br /><span className="grad">Disiplin, Akurat, Otomatis.</span></h1>
        <p className="lead">
          Presensia mencatat kehadiran lewat <strong>GPS + selfie</strong> dengan geofencing ketat,
          menghitung keterlambatan otomatis, dan menyusun rekap siap-ekspor —
          agar tim Anda fokus bekerja, bukan mengurus absen.
        </p>
        <div className="hero-cta">
          <a className="btn btn-primary btn-lg" href="#/daftar">Mulai Gratis 14 Hari <ArrowRight size={17} /></a>
          <a className="btn btn-ghost btn-lg" href="#fitur">Jelajahi Fitur</a>
        </div>
        <div className="hero-proof">
          <div><strong>300+</strong><span>Edge locations</span></div>
          <div><strong>99,9%</strong><span>Uptime target</span></div>
          <div><strong>&lt;100ms</strong><span>Respons API</span></div>
          <div><strong>0</strong><span>Biaya instalasi</span></div>
        </div>
      </section>

      <section id="fitur" className="features">
        <div className="section-head">
          <span className="kicker">FITUR UNGGULAN</span>
          <h2>Semua yang Dibutuhkan Perusahaan Modern</h2>
          <p>Dari startup 5 orang hingga perusahaan ribuan karyawan — satu platform untuk semua.</p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature">
              <div className="feature-icon"><f.icon size={21} /></div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="how">
        <div className="section-head">
          <span className="kicker">CARA KERJA</span>
          <h2>Tiga Langkah, Selesai.</h2>
        </div>
        <div className="how-grid">
          <div className="how-step"><span className="how-num">1</span><h3>Tandai Lokasi Kantor</h3><p>Admin menandai titik kantor/klinik/cabang beserta radius geofence-nya. Butuh 1 menit per lokasi.</p></div>
          <div className="how-step"><span className="how-num">2</span><h3>Karyawan Clock-In</h3><p>Buka browser ponsel → selfie → clock-in. Server memverifikasi lokasi & mencatat semuanya otomatis.</p></div>
          <div className="how-step"><span className="how-num">3</span><h3>Rekap Siap Pakai</h3><p>Dashboard menampilkan KPI realtime; akhir bulan tinggal ekspor CSV untuk payroll.</p></div>
        </div>
      </section>

      <section id="harga" className="pricing">
        <div className="section-head">
          <span className="kicker">HEMAT & TRANSPARAN</span>
          <h2>Harga Jujur, Bayar via DOKU</h2>
          <p>Mulai 14 hari gratis tanpa kartu kredit. QRIS, virtual account, dan e-wallet tersedia.</p>
        </div>
        <div className="plan-grid">
          {plans.map((p) => (
            <div key={p.id} className={`plan ${p.months >= 12 ? 'plan-best' : ''}`}>
              {p.months >= 12 && <span className="plan-badge">PALING HEMAT</span>}
              <h3>{p.name}</h3>
              <div className="plan-price">{rupiah(p.price)}<small> /{p.months >= 12 ? 'tahun' : 'bulan'}</small></div>
              <ul>
                <li><Check size={15} /> Hingga {p.employeeQuota} karyawan</li>
                <li><Check size={15} /> Clock-in GPS + selfie</li>
                <li><Check size={15} /> Dashboard analitik + ekspor CSV</li>
                <li><Check size={15} /> Izin & cuti online</li>
                <li><Check size={15} /> Dukungan prioritas</li>
              </ul>
              <a className="btn btn-primary" href="#/daftar">Mulai Sekarang</a>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-final">
        <h2>Siap Membuang Buku Absensi?</h2>
        <p>Bergabung dengan perusahaan yang memilih disiplin otomatis.</p>
        <a className="btn btn-primary btn-lg" href="#/daftar">Coba Gratis Sekarang <CheckCircle2 size={17} /></a>
      </section>

      <footer className="footer">
        <span>© {new Date().getFullYear()} Presensia — absensi karyawan kelas dunia. Dibangun di Cloudflare.</span>
      </footer>
    </div>
  );
}
