import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { api, ApiError } from '../api';
import type { Me } from '../App';

export default function LeavesTab({ me }: { me: Me }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ type: 'leave', dateFrom: '', dateTo: '', reason: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Form default tertutup — tabel pengajuan dulu.
  const [showForm, setShowForm] = useState(false);
  const isAdmin = me.role !== 'employee';

  const { data } = useQuery({ queryKey: ['leaves'], queryFn: () => api.leaves() });
  const leaves = data?.leaves ?? [];
  const { data: balData } = useQuery({ queryKey: ['leave-balance'], queryFn: () => api.leaveBalances() });
  const myBalance = balData?.balances.find((b) => b.email === me.email);
  const balances = balData?.balances ?? [];

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.requestLeave({ ...form, reason: form.reason || undefined });
      setForm({ type: 'leave', dateFrom: '', dateTo: '', reason: '' });
      setShowForm(false);
      void qc.invalidateQueries({ queryKey: ['leaves'] });
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Gagal.'); } finally { setBusy(false); }
  };

  const review = async (id: string, approve: boolean): Promise<void> => {
    try { await api.reviewLeave(id, approve); void qc.invalidateQueries({ queryKey: ['leaves'] }); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Gagal.'); }
  };

  const statusBadge = (l: { status: string }): React.ReactNode =>
    l.status === 'pending' ? <span className="badge leave-pending">Menunggu Manager</span>
      : l.status === 'pending_hr' ? <span className="badge leave-pending">Menunggu HR/Admin</span>
      : l.status === 'approved' ? <span className="badge leave-approved">Disetujui</span>
      : <span className="badge leave-rejected">Ditolak</span>;

  return (
    <div className="two-col">
      <div className="card">
        <div className="form-toggle-row">
          <h2>Ajukan Izin</h2>
          <button className={`btn btn-sm ${showForm ? 'btn-ghost' : 'btn-primary'}`} onClick={() => setShowForm((v) => !v)}>
            {showForm ? <><X size={14} /> Tutup</> : <><Plus size={14} /> Ajukan Izin</>}
          </button>
        </div>
        {showForm && <form className="grid-form form-panel" onSubmit={(e) => { void submit(e); }}>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="leave">Cuti / Izin</option>
            <option value="sick">Sakit</option>
            <option value="remote">Kerja Remote</option>
          </select>
          <div className="coord-row">
            <label className="mini">Dari<input type="date" value={form.dateFrom} onChange={(e) => setForm({ ...form, dateFrom: e.target.value })} required /></label>
            <label className="mini">Sampai<input type="date" value={form.dateTo} onChange={(e) => setForm({ ...form, dateTo: e.target.value })} required /></label>
          </div>
          <textarea placeholder="Alasan (opsional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} />
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Mengirim…' : 'Kirim Pengajuan'}</button>
        </form>}
        <p className="muted small">Pengajuan melebihi batas hari kerja yang diatur admin otomatis butuh persetujuan dua tingkat (manager → HR).</p>
        {error && <div className="error-box">{error}</div>}
      </div>

      <div className="card">
        <h2>Saldo Cuti {balData ? balData.year : ''}</h2>
        {isAdmin ? (
          <table className="table" style={{ marginTop: 8 }}>
            <thead><tr><th>Nama</th><th>Kuota</th><th>Terpakai</th><th>Sisa</th></tr></thead>
            <tbody>
              {balances.map((b) => (
                <tr key={b.email}><td>{b.name}</td><td>{b.quota} hari</td><td>{b.used} hari</td>
                  <td><b style={{ color: b.remaining <= 2 ? 'crimson' : undefined }}>{b.remaining} hari</b></td></tr>
              ))}
              {balances.length === 0 && <tr><td colSpan={4} className="muted">Belum ada data.</td></tr>}
            </tbody>
          </table>
        ) : (
          <div className="summary-kpis" style={{ marginTop: 10 }}>
            <div><b>{myBalance?.quota ?? '—'}</b><span>Kuota (hari)</span></div>
            <div><b>{myBalance?.used ?? '—'}</b><span>Terpakai</span></div>
            <div><b>{myBalance?.remaining ?? '—'}</b><span>Sisa</span></div>
          </div>
        )}
        <p className="muted small">Kuota bawaan 12 hari kerja/tahun; cuti disetujui otomatis mengurangi saldo.</p>
      </div>

      <div className="card">
        <h2>{isAdmin ? 'Pengajuan Tim' : 'Pengajuan Saya'}</h2>
        <table className="table">
          <thead><tr>{isAdmin && <th>Nama</th>}<th>Jenis</th><th>Tanggal</th><th>Status</th>{isAdmin && <th>{' '}</th>}</tr></thead>
          <tbody>
            {leaves.map((l) => (
              <tr key={l.id}>
                {isAdmin && <td>{l.name ?? l.email}</td>}
                <td>{l.type === 'leave' ? 'Cuti' : l.type === 'sick' ? 'Sakit' : 'Remote'}</td>
                <td className="muted">{l.dateFrom} → {l.dateTo}</td>
                <td>{statusBadge(l)}{l.reviewNote && <div className="muted small">{l.reviewNote}</div>}</td>
                {isAdmin && (
                  <td>{l.status === 'pending' && (
                    <span className="review-btns">
                      <button className="btn btn-primary btn-sm" onClick={() => { void review(l.id, true); }}>Setujui</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { void review(l.id, false); }}>Tolak</button>
                    </span>
                  )}{l.status === 'pending_hr' && <span className="muted small">Tingkat 2 (HR)</span>}</td>
                )}
              </tr>
            ))}
            {leaves.length === 0 && <tr><td colSpan={5} className="muted">Belum ada pengajuan.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
