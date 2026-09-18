import { useEffect, useState } from 'react';
import { Download, Users, CheckCircle2, AlertTriangle, CalendarX2, Palmtree, Activity } from 'lucide-react';
import { api, type Summary, type LiveActivity } from '../api';

const KPI = [
  { key: 'present', label: 'Hadir', icon: CheckCircle2, cls: 'kpi-green' },
  { key: 'late', label: 'Terlambat', icon: AlertTriangle, cls: 'kpi-amber' },
  { key: 'absent', label: 'Absen', icon: CalendarX2, cls: 'kpi-red' },
  { key: 'leave', label: 'Izin/Sakit', icon: Palmtree, cls: 'kpi-blue' },
] as const;

export default function AnalyticsTab() {
  const [sum, setSum] = useState<Summary | null>(null);
  const [live, setLive] = useState<LiveActivity[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    api.summary().then(setSum).catch(() => {});
    api.live().then((r) => setLive(r.activities)).catch(() => {});
    const t = setInterval(() => { api.live().then((r) => setLive(r.activities)).catch(() => {}); }, 15_000);
    return () => clearInterval(t);
  }, []);

  if (!sum) return <div className="card"><p className="muted">Memuat dashboard…</p></div>;

  const trendMax = Math.max(1, ...sum.trend.map((t) => (t.present ?? 0) + (t.late ?? 0) + (t.absent ?? 0)));

  return (
    <div className="analytics">
      <div className="analytics-head">
        <div>
          <h2>Dashboard Kehadiran</h2>
          <p className="muted">{new Date(`${sum.date}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {sum.headcount} karyawan terdaftar</p>
        </div>
        <div className="export-row">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="month-input" />
          <button className="btn btn-primary" onClick={() => api.exportCsv(month)}><Download size={14} /> Ekspor CSV</button>
        </div>
      </div>

      <div className="kpi-grid">
        {KPI.map((k) => (
          <div key={k.key} className={`kpi-card ${k.cls}`}>
            <k.icon size={20} />
            <div className="kpi-num">{sum.today[k.key]}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="analytics-grid">
        <div className="card">
          <h3>Tren 7 Hari Terakhir</h3>
          <div className="trend">
            {sum.trend.length === 0 && <p className="muted">Belum ada data.</p>}
            {sum.trend.map((t) => {
              const total = (t.present ?? 0) + (t.late ?? 0) + (t.absent ?? 0);
              const h = (n: number): string => `${(n / trendMax) * 100}%`;
              return (
                <div key={t.work_date} className="trend-col" title={`${t.work_date}: hadir ${t.present ?? 0}, telat ${t.late ?? 0}, absen ${t.absent ?? 0}`}>
                  <div className="trend-bars">
                    <div className="bar bar-green" style={{ height: h(t.present ?? 0) }} />
                    <div className="bar bar-amber" style={{ height: h(t.late ?? 0) }} />
                    <div className="bar bar-red" style={{ height: h(t.absent ?? 0) }} />
                  </div>
                  <span className="trend-date">{t.work_date.slice(8)}</span>
                  <span className="trend-total">{total}</span>
                </div>
              );
            })}
          </div>
          <div className="legend">
            <span><i className="dot dot-green" /> Hadir</span>
            <span><i className="dot dot-amber" /> Telat</span>
            <span><i className="dot dot-red" /> Absen</span>
          </div>
        </div>

        <div className="card">
          <h3>Bradford Factor (90 hari) — indikator bolos jangka pendek</h3>
          <p className="muted small">Skor = S² × D (S = rangkaian sakit terpisah, D = total hari sakit). Skor tinggi = sering sakit 1–2 hari putus-putus — secara operasional lebih merusak daripada sakit panjang.</p>
          {(sum.bradford?.length ?? 0) === 0 ? <p className="muted">Tidak ada data sakit 90 hari terakhir. 🎉</p> : (
            <ol className="leader-list">
              {sum.bradford!.map((b) => (
                <li key={b.email}><span>{b.name}</span>
                  <span className="badge status-late">{b.score} <em className="muted small">({b.spells}× / {b.days} hr)</em></span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="card">
          <h3>Paling Sering Telat (30 hari)</h3>
          {sum.lateLeaders.length === 0 ? <p className="muted">Tidak ada keterlambatan — pertahankan! 🎉</p> : (
            <ol className="leader-list">
              {sum.lateLeaders.map((l) => (
                <li key={l.name}><span>{l.name}</span><span className="badge status-late">{l.late_count}×</span></li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="card">
        <h3><Activity size={17} /> Aktivitas Terbaru</h3>
        <div className="live-feed">
          {live.length === 0 && <p className="muted">Belum ada aktivitas hari ini.</p>}
          {live.map((a, i) => (
            <div key={i} className="live-row">
              <span className="live-name">{a.name}</span>
              <span className="muted">
                {a.clockOutAt
                  ? `clock-out ${new Date(a.clockOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                  : a.clockInAt
                    ? `clock-in ${new Date(a.clockInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                    : ''}
              </span>
              <span className={`badge status-${a.status}`}>{a.status === 'present' ? 'Tepat Waktu' : a.status === 'late' ? 'Telat' : a.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="users-row"><Users size={16} /> <span>Total <strong>{sum.headcount}</strong> karyawan — tambahkan dari menu Karyawan.</span></div>
      </div>
    </div>
  );
}
