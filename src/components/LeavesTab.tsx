import { useEffect, useState } from 'react';
import { api, ApiError, type Leave } from '../api';
import type { Me } from '../App';

export default function LeavesTab({ me }: { me: Me }) {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [form, setForm] = useState({ type: 'leave', dateFrom: '', dateTo: '', reason: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isAdmin = me.role !== 'employee';

  const load = (): void => { api.leaves().then((r) => setLeaves(r.leaves)).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.requestLeave({ ...form, reason: form.reason || undefined });
      setForm({ type: 'leave', dateFrom: '', dateTo: '', reason: '' });
      load();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Gagal.'); } finally { setBusy(false); }
  };

  const review = async (id: string, approve: boolean): Promise<void> => {
    try { await api.reviewLeave(id, approve); load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Gagal.'); }
  };

  return (
    <div className="two-col">
      <div className="card">
        <h2>Ajukan Izin</h2>
        <form className="grid-form" onSubmit={(e) => { void submit(e); }}>
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
        </form>
        {error && <div className="error-box">{error}</div>}
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
                <td><span className={`badge leave-${l.status}`}>{l.status === 'pending' ? 'Menunggu' : l.status === 'approved' ? 'Disetujui' : 'Ditolak'}</span></td>
                {isAdmin && (
                  <td>{l.status === 'pending' && (
                    <span className="review-btns">
                      <button className="btn btn-primary btn-sm" onClick={() => { void review(l.id, true); }}>Setujui</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { void review(l.id, false); }}>Tolak</button>
                    </span>
                  )}</td>
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
