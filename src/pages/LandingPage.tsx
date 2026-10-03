import { useEffect, useState } from 'react';
import {
  ShieldCheck, Cog, Timer, LineChart, Check, Lock, Globe2, Database,
  Coffee, Factory, Store, ChevronRight,
} from 'lucide-react';
import { api, type Plan } from '../api';
import { Logo, LogoMark } from '../components/Brand';

/* ── Mock visual kecil (murni CSS, tanpa gambar) ─────────────────── */
function HeroDashboard(): React.ReactNode {
  const bars = [38, 62, 45, 80, 55, 92];
  return (
    <div className="hero-dashboard">
      <div className="hero-dash-top"><Logo size={18} /><span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>Ilustrasi dashboard</span></div>
      <div className="hero-kpis"><div className="hero-kpi hero-kpi-blue"><span>Tim terjadwal</span><b>48</b></div><div className="hero-kpi hero-kpi-red"><span>Terlambat</span><b>2</b></div><div className="hero-kpi hero-kpi-green"><span>Sudah hadir</span><b>46</b></div></div>
      <div className="hero-rows">{['Mira Sari', 'Rian Hadi', 'Dewi Lestari'].map((name, row) => <div key={name} className="hero-row"><span className="hero-avatar">{name[0]}</span><b>{name}</b><span className={`hero-pill ${row === 1 ? 'pill-amber' : 'pill-green'}`}>{row === 1 ? 'Late' : 'On-time'}</span><span className="hero-bars">{bars.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</span></div>)}</div>
    </div>
  );
}

function FeaturePhoneMap(): React.ReactNode {
  return (
    <div className="mock-phone">
      <div className="mock-phone-screen mock-map-screen">
        <div className="mock-map">
          <div className="mock-map-grid" />
          <div className="mock-geofence" />
          <span className="mock-map-label">📍 Kantor Pusat · radius 150 m</span>
        </div>
      </div>
    </div>
  );
}

function FeatureSelfie(): React.ReactNode {
  return (
    <div className="mock-selfie">
      <div className="mock-selfie-screen">
        <div className="mock-face">
          <div className="mock-face-head" />
          <div className="mock-face-scan" />
          <span className="mock-face-corner fc-tl" />
          <span className="mock-face-corner fc-tr" />
          <span className="mock-face-corner fc-bl" />
          <span className="mock-face-corner fc-br" />
        </div>
      </div>
      <div className="mock-selfie-hint">LIVENESS · CODE 482·913</div>
    </div>
  );
}

function FeatureCalendar(): React.ReactNode {
  const cells: { d: number; ev?: string; cls?: string }[] = [
    { d: 1 }, { d: 2, ev: 'Early', cls: 'ev-green' }, { d: 3, ev: 'Closing', cls: 'ev-amber' }, { d: 4 }, { d: 5, ev: 'Off', cls: 'ev-blue' }, { d: 6 }, { d: 7 },
    { d: 8, ev: 'Opening', cls: 'ev-green' }, { d: 9, ev: 'Middle', cls: 'ev-purple' }, { d: 10, ev: 'Closing', cls: 'ev-amber' }, { d: 11 }, { d: 12, ev: 'Middle', cls: 'ev-purple' }, { d: 13 }, { d: 14 },
    { d: 15, ev: 'Opening', cls: 'ev-green' }, { d: 16 }, { d: 17, ev: 'Middle', cls: 'ev-purple' }, { d: 18, ev: 'Off', cls: 'ev-blue' }, { d: 19 }, { d: 20, ev: 'Early', cls: 'ev-green' }, { d: 21 },
  ];
  return (
    <div className="mock-calendar-card">
      <div className="mock-calendar-head"><span>Shift Rules</span><span className="mock-chip">Cross-midnight ✓</span></div>
      <div className="mock-cal-grid">
        {cells.map((c) => (
          <div key={c.d} className={`mock-cal-cell ${c.cls ?? ''}`}>{c.ev ?? c.d}</div>
        ))}
      </div>
    </div>
  );
}

function FeaturePayroll(): React.ReactNode {
  const rows = [
    { n: 'Mira Sari', i: '07:52', o: '17:04', s: 'Present', c: 'mb-green' },
    { n: 'Rian Hadi', i: '08:26', o: '17:02', s: 'Late 26m', c: 'mb-amber' },
    { n: 'Dewi Lestari', i: '07:58', o: '17:00', s: 'Overtime', c: 'mb-blue' },
  ];
  return (
    <div className="mock-pay-card">
      <div className="mock-pay-head">
        <span className="mock-pay-title">Timesheet November</span>
        <span className="mock-chip-row"><span className="mock-chip">CSV</span><span className="mock-chip">Payroll-ready</span></span>
      </div>
      <div className="mock-pay-row" style={{ fontWeight: 800, color: 'var(--navy)' }}><span>Nama</span><span>Masuk</span><span>Keluar</span><span>Status</span></div>
      {rows.map((r) => (
        <div key={r.n} className="mock-pay-row">
          <b>{r.n}</b><span>{r.i}</span><span>{r.o}</span>
          <span className={`mock-badge ${r.c}`}>{r.s}</span>
        </div>
      ))}
    </div>
  );
}

const CHECK = <Check size={15} strokeWidth={3} />;

export default function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  useEffect(() => { api.plans().then((r) => setPlans(r.plans)).catch(() => {}); }, []);

  return (
    <div className="lp">
      {/* NAV */}
      <nav className="lp-nav">
        <a href="#top"><Logo size={30} /></a>
        <div className="lp-nav-links">
          <a href="#features">Fitur</a>
          <a href="#pricing">Harga</a>
          <a href="#how">Cara kerja</a>
          <a href="#footer">Bantuan</a>
        </div>
        <div className="lp-nav-cta">
          <a className="btn btn-primary btn-sm" href="#/masuk">Login</a>
        </div>
      </nav>

      {/* HERO */}
      <header className="lp-hero" id="top">
        <div className="lp-hero-copy">
          <p className="lp-eyebrow">UNTUK TIM YANG TERUS BERGERAK</p>
          <h1>Absensi rapi.<br /><em>Tim lebih terarah.</em></h1>
          <p className="lp-tagline">Kelola kehadiran, shift, cuti, dan payroll dalam satu tempat. Dari absen pertama hingga gajian.</p>
          <div className="lp-hero-ctas">
            <a className="btn btn-primary btn-lg" href="#/daftar">Coba Gratis</a>
            <a className="btn btn-secondary btn-lg" href="#how">Lihat cara kerja</a>
          </div>
        </div>
        <div className="lp-hero-visual">
          <HeroDashboard />
          <div className="hero-phone">
            <div className="hero-phone-screen">
              <div className="hero-phone-map"><div className="hero-phone-pin" /></div>
              <div className="hero-phone-btn">Clock-in Sekarang</div>
            </div>
          </div>
        </div>
      </header>

      {/* PARTNER STRIP */}
      <section className="lp-partners">
        <h4>Dirancang untuk beragam cara kerja</h4>
        <div className="lp-partners-row">
          <span className="lp-partner"><Coffee size={17} /> Kafe & restoran</span>
          <span className="lp-partner"><Factory size={17} /> Manufaktur</span>
          <span className="lp-partner"><Store size={17} /> Toko & retail</span>
          <span className="lp-partner"><Cog size={17} /> Operasional</span>
          <span className="lp-partner"><LogoMark size={18} /> Tim kantor</span>
          <span className="lp-partner"><Globe2 size={17} /> Multi-cabang</span>
        </div>
      </section>

      {/* FEATURES 1–5 */}
      <section className="lp-section" id="features">
        <span className="lp-kicker">Fitur Unggulan</span>
        <h2 className="lp-title">Semua yang HR butuhkan. Tanpa celah.</h2>

        <div className="feat" style={{ marginTop: 44 }}>
          <div className="feat-visual"><div className="feat-blob" /><div className="mock feature-asset-frame"><img src="/brand/pages-mockup.jpeg" alt="Presensia attendance and geofencing interface" /></div></div>
          <div className="feat-copy">
            <span className="feat-num">1.</span>
            <h3>Geofencing &amp; Anti-Fake GPS</h3>
            <p>Clock-in hanya diterima dalam radius kantor — jarak dihitung di server (haversine), bukan di ponsel. Akurasi GPS divalidasi; sinyal tidak wajar ditolak atau ditandai, dan IP dicatat untuk cross-check.</p>
            <ul className="feat-list">
              <li>{CHECK} Radius geofence fleksibel per lokasi (20–2000 m)</li>
              <li>{CHECK} Validasi akurasi + flag low-accuracy otomatis</li>
              <li>{CHECK} Audit IP per absensi untuk deteksi anomali</li>
            </ul>
          </div>
        </div>

        <div className="feat rev">
          <div className="feat-copy">
            <span className="feat-num">2.</span>
            <h3>Liveness &amp; Anti Titip-Absen</h3>
            <p>Setiap selfie wajib menyertakan <strong>kode verifikasi 6 digit</strong> yang diterbitkan server dan kedaluwarsa dalam 90 detik. Foto lama, screenshot, atau titip absen otomatis gagal.</p>
            <ul className="feat-list">
              <li>{CHECK} Kode sekali pakai — dibakar saat dipakai</li>
              <li>{CHECK} Overlay kode di kamera, wajib terlihat bersama wajah</li>
              <li>{CHECK} Selfie tersimpan aman di R2, akses ber-otorisasi</li>
            </ul>
          </div>
          <div className="feat-visual"><div className="feat-blob" /><div className="mock"><FeatureSelfie /></div></div>
        </div>

        <div className="feat">
          <div className="feat-visual"><div className="feat-blob" /><div className="mock"><FeatureCalendar /></div></div>
          <div className="feat-copy">
            <span className="feat-num">3.</span>
            <h3>Dynamic Shift Scheduling &amp; Tolerances</h3>
            <p>Shift pagi/siang/malam dengan masa tenggang per shift. Shift lintas tengah malam (20:00→04:00) dihitung satu hari kerja — bukan absen ganda.</p>
            <ul className="feat-list">
              <li>{CHECK} Cross-midnight shift native</li>
              <li>{CHECK} Grace minutes per shift</li>
              <li>{CHECK} Status late dihitung server, bukan klien</li>
            </ul>
          </div>
        </div>

        <div className="feat rev">
          <div className="feat-copy">
            <span className="feat-num">4.</span>
            <h3>Leave, Absence &amp; Sick Management Online</h3>
            <p>Ajukan cuti/sakit/remote dari ponsel. Persetujuan berjenjang: manager dulu, HR berikutnya untuk pengajuan panjang. Manager cuti? Delegasikan wewenangnya.</p>
            <ul className="feat-list">
              <li>{CHECK} Two-tier approval otomatis sesuai kebijakan</li>
              <li>{CHECK} Delegasi wewenang berkala</li>
              <li>{CHECK} Status real-time di dashboard</li>
            </ul>
          </div>
          <div className="feat-visual"><div className="feat-blob" /><div className="mock"><FeaturePhoneMap /></div></div>
        </div>

        <div className="feat">
          <div className="feat-visual"><div className="feat-blob" /><div className="mock"><FeaturePayroll /></div></div>
          <div className="feat-copy">
            <span className="feat-num">5.</span>
            <h3>Payroll Otomatis: Slip Gaji hingga Bukti Potong</h3>
            <p>Kunci periode, hitung draft, finalisasi — slip gaji jadi dengan PPh 21 TER (PP 58/2023), tarif Pasal 17 Desember, iuran BPJS, dan THR BR-13. Bukti potong 1721-A1 siap unduh dengan QR verifikasi.</p>
            <ul className="feat-list">
              <li>{CHECK} Slip gaji: gaji pokok, lembur, potongan, net</li>
              <li>{CHECK} PPh 21 &amp; BPJS mengikuti config, tanpa spreadsheet</li>
              <li>{CHECK} THR prorata + PDF 1721-A1 ber-QR verifikasi</li>
            </ul>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-section hiw" id="how">
        <span className="lp-kicker">How It Works</span>
        <h2 className="lp-title">Jalan dalam 3 langkah</h2>
        <div className="hiw-grid">
          <div className="hiw-step"><span className="hiw-step-num">1</span>
            <div className="hiw-icon i1"><Cog size={26} /></div>
            <h4>Setup</h4><p>Daftar, tambahkan lokasi kantor &amp; shift. Selesai dalam hitungan menit.</p>
          </div>
          <div className="hiw-step"><span className="hiw-step-num">2</span>
            <div className="hiw-icon i2"><Timer size={26} /></div>
            <h4>Clock-in</h4><p>Karyawan absen dengan GPS + selfie berkode verifikasi. Semua tervalidasi server.</p>
          </div>
          <div className="hiw-step"><span className="hiw-step-num">3</span>
            <div className="hiw-icon i3"><LineChart size={26} /></div>
            <h4>Monitor</h4><p>Dashboard real-time, approval cuti, dan payroll sampai slip gaji.</p>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="lp-section">
        <span className="lp-kicker">Use Cases</span>
        <h2 className="lp-title">Dibangun untuk semua tim</h2>
        <div className="uc-grid">
          <div className="uc-card"><div className="uc-art a1"><Coffee size={40} /></div>
            <div className="uc-body"><h4>Small Business (Cafe)</h4><p>Shift rotasi barista, toleransi 15 menit, rekap gaji bulanan.</p></div></div>
          <div className="uc-card"><div className="uc-art a2"><Factory size={40} /></div>
            <div className="uc-body"><h4>Manufacturing (Factory)</h4><p>Shift malam lintas tengah malam, lembur dengan multiplier.</p></div></div>
          <div className="uc-card"><div className="uc-art a3"><Store size={40} /></div>
            <div className="uc-body"><h4>Retail (Multiple Stores)</h4><p>Banyak lokasi cabang, geofence per toko, dashboard terpusat.</p></div></div>
        </div>
      </section>

      {/* PRICING */}
      <section className="lp-section" id="pricing">
        <span className="lp-kicker">Paket langganan</span>
        <h2 className="lp-title">Harga jujur, skalabel</h2>
        <p className="lp-lead">Mulai gratis, naik saat tim tumbuh. Semua paket termasuk geofencing, selfie verifikasi, dan dashboard real-time.</p>
        <div className="price-grid">
          {(plans.length ? plans : [
            { id: 'basic', name: 'Basic', price: 20000, employeeQuota: 10, months: 1 },
            { id: 'pro', name: 'Pro', price: 100000, employeeQuota: 50, months: 1 },
            { id: 'ent', name: 'Enterprise', price: 350000, employeeQuota: 500, months: 1 },
          ]).slice(0, 3).map((p, i) => (
            <div key={p.id} className={`price-card ${i === 1 ? 'hot' : ''}`}>
              {i === 1 && <span className="price-flag">PALING POPULER</span>}
              <div className="price-name">{p.name}</div>
              <div className="price-for">{i === 0 ? 'untuk tim kecil sampai 10 karyawan' : i === 1 ? 'untuk bisnis bertumbuh & multi-cabang' : 'untuk operasi besar & enterprise'}</div>
              <div className="price-amount"><small>Rp</small><b>{(p.price).toLocaleString('id-ID')}</b><span>/bulan</span></div>
              <ul className="price-feats">
                <li>{CHECK} Hingga {p.employeeQuota} karyawan</li>
                <li>{CHECK} Clock-in GPS + selfie berkode</li>
                <li>{CHECK} {i === 0 ? 'Rekap & dashboard dasar' : i === 1 ? 'Two-tier approval + delegasi' : 'Bradford Factor + koreksi audit'}</li>
                <li>{CHECK} Ekspor {i === 2 ? 'payroll CSV penuh' : 'CSV bulanan'}</li>
                {i > 0 && <li>{CHECK} Dukungan prioritas</li>}
              </ul>
              <a className={`btn btn-block ${i === 2 ? 'btn-teal' : 'btn-primary'}`} href="#/daftar">{i === 2 ? 'Hubungi Kami' : 'Coba Gratis'}</a>
            </div>
          ))}
        </div>
      </section>

      {/* SECURITY */}
      <section className="lp-section">
        <span className="lp-kicker">Perlindungan data</span>
        <h2 className="lp-title">Akses sesuai tanggung jawab</h2>
        <div className="sec-grid">
          <div className="sec-item"><div className="sec-icon"><Lock size={20} /></div>
            <div><b>Akses terkontrol</b><span>Data absensi dan foto hanya dapat diakses melalui akun yang berwenang.</span></div></div>
          <div className="sec-item"><div className="sec-icon"><ShieldCheck size={20} /></div>
            <div><b>Koreksi dapat ditelusuri</b><span>Perubahan catatan absensi disertai alasan untuk membantu pemeriksaan.</span></div></div>
          <div className="sec-item"><div className="sec-icon"><Database size={20} /></div>
            <div><b>Data terpusat</b><span>Kelola catatan kehadiran dan rekap tim dari satu tempat.</span></div></div>
        </div>
      </section>

      {/* CTA */}
      <div className="lp-cta-wrap">
        <div className="lp-cta">
          <h2>Siap merapikan absensi tim?</h2>
          <p>Coba 14 hari gratis. Tanpa kartu kredit.</p>
          <a className="btn" href="#/daftar">Mulai Coba Gratis 14 Hari</a>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="lp-footer" id="footer">
        <div className="lp-footer-grid">
          <div>
            <Logo size={24} dark />
            <p className="lp-footer-desc" style={{ marginTop: 10 }}>Presensia — absensi karyawan presisi: GPS, selfie terverifikasi, shift fleksibel, dan payroll otomatis sampai bukti potong pajak.</p>

          </div>
          <div><h5>Produk</h5><a href="#top">Tentang Presensia</a><a href="#pricing">Paket</a><a href="#how">Cara kerja</a></div>
          <div><h5>Akun</h5><a href="#/masuk">Masuk</a><a href="#/daftar">Daftar</a></div>
          <div><h5>Kontak</h5><a href="mailto:presensia.app@yazastudios.com">presensia.app@yazastudios.com</a></div>
        </div>
        <div className="lp-copy">© 2026 Presensia · Absensi rapi, tim lebih terarah. <ChevronRight size={12} style={{ verticalAlign: 'middle' }} /></div>
      </footer>
    </div>
  );
}
