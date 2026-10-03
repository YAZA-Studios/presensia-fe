import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, Plus, Clock } from 'lucide-react';
import { api, ApiError, type Overtime } from '../api';
import type { Me } from '../App';

const STATUS: Record<string, string> = {
  pending: 'badge leave-pending', approved: 'badge leave-approved', rejected: 'badge leave-rejected',
};

/** Tab Lembur — pengajuan lembur (SHF-03) + persetujuan atasan/admin.
 *  Lembur disetujui otomatis masuk perhitungan payroll. */
export default function OvertimeTab({ me }: { me: Me }) {
  const qc = useQueryClient();
  const canReview = me.role !== 'employee';
  const [form, setForm] = useState({ workDate: new Date().toISOString().slice(0, 10), minutes: 60, reason: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data } = useQuery({ queryKey: ['overtime'], queryFn: () => api.overtime() });
  const rows = data?.overtime ?? [];

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      await api.requestOvertime({ ...form, reason: form.reason || undefined });
      setForm({ ...form, reason: '' });
      setShowForm(false);
      void qc.invalidateQueries({ queryKey: ['overtime'] });
    } catch (err) { setMsg(err instanceof ApiError ? err.message : 'Gagal mengajukan.'); } finally { setBusy(false); }
  };

  const review = async (id: string, approve: boolean): Promise<void> => {
    try { await api.reviewOvertime(id, approve); void qc.invalidateQueries({ queryKey: ['overtime'] }); }
    catch (err) { setMsg(err instanceof ApiError ? err.message : 'Gagal.'); }
  };

  return (
    <div className="two-col">
      <div className="card">
        <div className="form-toggle-row">
          <h2><Clock size={16} style={{ verticalAlign: '-3px' }} /> Lembur</h2>
          <button className={`btn btn-sm ${showForm ? 'btn-ghost' : 'btn-primary'}`} onClick={() => setShowForm((v) => !v)}>
            {showForm ? <><X size={14} /> Tutup</> : <><Plus size={14} /> Ajukan Lembur</>}
          </button>
        </div>
        {showForm && (
          <form className="grid-form form-panel" onSubmit={(e) => { void submit(e); }}>
            <div className="coord-row">
              <label className="mini">Tanggal
                <input type="date" value={form.workDate} onChange={(e) => setForm({ ...form, workDate: e.target.value })} required />
              </label>
              <label className="mini">Durasi (menit)
                <input type="number" min={30} max={480} step={30} value={form.minutes}
                  onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })} required />
              </label>
            </div>
            <textarea placeholder="Alasan / pekerjaan yang dikerjakan (opsional)" value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} />
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Mengirim…' : 'Kirim Pengajuan'}</button>
          </form>
        )}
        {msg && <p className="muted small" style={{ color: 'crimson' }}>{msg}</p>}
        <table className="table" style={{ marginTop: 10 }}>
          <thead><tr><th>Tanggal</th>{canReview && <th>Nama</th>}<th>Durasi</th><th>Alasan</th><th>Status</th>{canReview && <th></th>}</tr></thead>
          <tbody>
            {rows.map((o: Overtime) => (
              <tr key={o.id}>
                <td>{o.workDate}</td>
                {canReview && <td>{o.name ?? o.email}</td>}
                <td>{o.minutes} mnt</td>
                <td className="muted small">{o.reason ?? '—'}</td>
                <td><span className={STATUS[o.status] ?? 'badge'}>{o.status}</span></td>
                {canReview && (
                  <td>
                    {o.status === 'pending' && (
                      <span style={{ display: 'inline-flex', gap: 6 }}>
                        <button className="btn btn-sm btn-primary" title="Setujui" onClick={() => { void review(o.id, true); }}><Check size={13} /></button>
                        <button className="btn btn-sm btn-ghost" title="Tolak" onClick={() => { void review(o.id, false); }}><X size={13} /></button>
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={canReview ? 6 : 4} className="muted">Belum ada pengajuan lembur.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Cara kerja lembur</h3>
        <p className="muted small" style={{ marginTop: 8 }}>
          1. Ajukan lembur (30–480 menit) dengan alasan.<br />
          2. Atasan langsung / admin menyetujui.<br />
          3. Lembur disetujui otomatis dihitung ke slip gaji pada payroll bulan terkait
          (pengali hari kerja mengikuti Pengaturan → Kebijakan).<br />
          4. Lembur tanpa persetujuan tidak dibayar.
        </p>
      </div>
    </div>
  );
}
