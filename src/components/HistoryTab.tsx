import { useEffect, useState } from 'react';
import { api, type HistoryRow } from '../api';
import type { Me } from '../App';

const monthThis = (): string => new Date().toISOString().slice(0, 7);

const STATUS_LABEL: Record<string, string> = {
  present: 'Hadir', late: 'Telat', absent: 'Absen', leave: 'Izin', sick: 'Sakit', holiday: 'Libur',
};

export default function HistoryTab({ me }: { me: Me }) {
  const [month, setMonth] = useState(monthThis());
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.history(month).then((r) => setRows(r.rows)).catch(() => setRows([])).finally(() => setLoading(false));
  }, [month]);

  const count = (s: string): number => rows.filter((r) => r.status === s).length;
  const isAdmin = me.role !== 'employee';

  return (
    <div className="card">
      <div className="card-head">
        <h2>Rekap {new Date(`${month}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h2>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="month-input" />
      </div>
      {isAdmin && rows.length > 0 && (
        <div className="stat-row">
          <span className="stat">Hadir <strong>{count('present')}</strong></span>
          <span className="stat">Telat <strong>{count('late')}</strong></span>
          <span className="stat">Izin <strong>{count('leave')}</strong></span>
          <span className="stat">Sakit <strong>{count('sick')}</strong></span>
          <span className="stat">Absen <strong>{count('absent')}</strong></span>
        </div>
      )}
      {loading ? <p className="muted">Memuat…</p> : rows.length === 0 ? (
        <p className="muted">Belum ada data absensi bulan ini.</p>
      ) : (
        <table className="table">
          <thead><tr><th>Tanggal</th>{isAdmin && <th>Nama</th>}<th>Masuk</th><th>Keluar</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.work_date}-${r.name ?? ''}`}>
                <td>{new Date(`${r.work_date}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</td>
                {isAdmin && <td>{r.name ?? '—'}</td>}
                <td>{r.clock_in_at ? new Date(r.clock_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                <td>{r.clock_out_at ? new Date(r.clock_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                <td><span className={`badge status-${r.status}`}>{STATUS_LABEL[r.status] ?? r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
