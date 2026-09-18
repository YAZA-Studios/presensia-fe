import { useEffect, useState } from 'react';
import { FileText, FileSpreadsheet, Download, Wallet } from 'lucide-react';
import { api, type HistoryRow } from '../api';

/** Halaman Payroll — ringkasan bulan berjalan + ekspor timesheet. */
export default function PayrollPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<HistoryRow[]>([]);

  useEffect(() => {
    api.history(month).then((r) => setRows(r.rows)).catch(() => setRows([]));
  }, [month]);

  const present = rows.filter((r) => r.status === 'present' || r.status === 'late').length;
  const late = rows.filter((r) => r.status === 'late').length;
  const onLeave = rows.filter((r) => r.status === 'leave' || r.status === 'sick').length;
  const label = new Date(`${month}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <>
      <div className="main-head">
        <div>
          <h1><Wallet size={20} style={{ verticalAlign: '-4px' }} /> Payroll — {label}</h1>
          <p className="muted">Ringkasan kehadiran siap diproses tim payroll.</p>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="month-input" />
      </div>

      <div className="pay-grid">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3>Ringkasan {label}</h3>
            <div className="summary-kpis" style={{ marginTop: 12 }}>
              <div><b>{present}</b><span>Hari hadir (org)</span></div>
              <div><b>{late}</b><span>Terlambat</span></div>
              <div><b>{onLeave}</b><span>Izin/Sakit</span></div>
            </div>
            <p className="muted small">
              Angka = baris absensi bulan {label}. Unduh timesheet lengkap dengan jam kerja bersih, menit telat,
              dan lembur untuk diproses ke sistem payroll.
            </p>
          </div>
          <div className="pay-tile" style={{ marginBottom: 12 }}>
            <span className="pay-file-icon pfi-csv">CSV</span>
            <div style={{ flex: 1 }}>
              <b>Timesheet Payroll CSV</b>
              <span>Gross/break/net minutes, late, overtime — siap unggah ke software payroll.</span>
            </div>
            <button className="btn btn-primary" onClick={() => api.exportTimesheet(month)}><Download size={15} /> Unduh</button>
          </div>
          <div className="pay-tile">
            <span className="pay-file-icon pfi-xls"><FileSpreadsheet size={20} /></span>
            <div style={{ flex: 1 }}>
              <b>Rekap Absensi CSV</b>
              <span>Data mentah clock-in/out per karyawan untuk pengecekan manual.</span>
            </div>
            <button className="btn btn-ghost" onClick={() => api.exportCsv(month)}><FileText size={15} /> Unduh</button>
          </div>
        </div>

        <div className="card">
          <h3>Pratinjau (10 terakhir)</h3>
          <table className="table" style={{ marginTop: 10 }}>
            <thead><tr><th>Tanggal</th><th>Nama</th><th>Masuk</th><th>Keluar</th><th>Status</th></tr></thead>
            <tbody>
              {rows.slice(0, 10).map((r, i) => (
                <tr key={i}>
                  <td>{r.work_date}</td>
                  <td>{r.name ?? '—'}</td>
                  <td>{r.clock_in_at ? new Date(r.clock_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td>{r.clock_out_at ? new Date(r.clock_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td><span className={`badge status-${r.status}`}>{r.status}</span></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="muted">Belum ada absensi bulan ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
