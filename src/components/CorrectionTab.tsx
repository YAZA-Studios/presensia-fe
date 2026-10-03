import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, Plus, FileClock } from 'lucide-react';
import { api, ApiError, type AttendanceRequest } from '../api';
import type { Me } from '../App';

const STATUS: Record<string, string> = {
  pending: 'badge leave-pending', approved: 'badge leave-approved', rejected: 'badge leave-rejected',
};

/** Tab Koreksi Absensi — alur self-service ABS-05:
 *  karyawan mengajukan (jam benar + alasan) → atasan/admin menyetujui
 *  → absensi diperbarui + tercatat di audit log. */
export default function CorrectionTab({ me }: { me: Me }) {
  const qc = useQueryClient();
  const canReview = me.role !== 'employee';
  const [form, setForm] = useState({
    workDate: new Date().toISOString().slice(0, 10), clockIn: '', clockOut: '', reason: '',
  });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data } = useQuery({ queryKey: ['att-requests'], queryFn: () => api.attendanceRequests() });
  const rows = data?.requests ?? [];

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      await api.requestCorrection({
        workDate: form.workDate,
        clockInAt: form.clockIn ? `${form.workDate}T${form.clockIn}` : undefined,
        clockOutAt: form.clockOut ? `${form.workDate}T${form.clockOut}` : undefined,
        reason: form.reason,
      });
      setForm({ ...form, clockIn: '', clockOut: '', reason: '' });
      setShowForm(false);
      void qc.invalidateQueries({ queryKey: ['att-requests'] });
    } catch (err) { setMsg(err instanceof ApiError ? err.message : 'Gagal mengajukan.'); } finally { setBusy(false); }
  };

  const review = async (id: string, approve: boolean): Promise<void> => {
    try { await api.reviewCorrection(id, approve); void qc.invalidateQueries({ queryKey: ['att-requests'] }); }
    catch (err) { setMsg(err instanceof ApiError ? err.message : 'Gagal.'); }
  };

  return (
    <div className="two-col">
      <div className="card">
        <div className="form-toggle-row">
          <h2><FileClock size={16} style={{ verticalAlign: '-3px' }} /> Koreksi Absensi</h2>
          <button className={`btn btn-sm ${showForm ? 'btn-ghost' : 'btn-primary'}`} onClick={() => setShowForm((v) => !v)}>
            {showForm ? <><X size={14} /> Tutup</> : <><Plus size={14} /> Ajukan Koreksi</>}
          </button>
        </div>
        {showForm && (
          <form className="grid-form form-panel" onSubmit={(e) => { void submit(e); }}>
            <label className="mini">Tanggal lupa / salah absen
              <input type="date" value={form.workDate} onChange={(e) => setForm({ ...form, workDate: e.target.value })} required />
            </label>
            <div className="coord-row">
              <label className="mini">Jam masuk yang benar
                <input type="time" value={form.clockIn} onChange={(e) => setForm({ ...form, clockIn: e.target.value })} />
              </label>
              <label className="mini">Jam keluar yang benar
                <input type="time" value={form.clockOut} onChange={(e) => setForm({ ...form, clockOut: e.target.value })} />
              </label>
            </div>
            <textarea placeholder="Alasan (wajib, min 4 karakter) — mis. lupa clock-out karena meeting di luar kantor"
              value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} required />
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Mengirim…' : 'Kirim Pengajuan'}</button>
          </form>
        )}
        {msg && <p className="muted small" style={{ color: 'crimson' }}>{msg}</p>}
        <table className="table" style={{ marginTop: 10 }}>
          <thead><tr><th>Tanggal</th>{canReview && <th>Nama</th>}<th>Jam Diajukan</th><th>Alasan</th><th>Status</th>{canReview && <th></th>}</tr></thead>
          <tbody>
            {rows.map((r: AttendanceRequest) => (
              <tr key={r.id}>
                <td>{r.workDate}</td>
                {canReview && <td>{r.name ?? r.email}</td>}
                <td className="small">
                  {r.clockInAt ? `in ${r.clockInAt.slice(11, 16)}` : ''}{r.clockInAt && r.clockOutAt ? ' · ' : ''}
                  {r.clockOutAt ? `out ${r.clockOutAt.slice(11, 16)}` : ''}
                </td>
                <td className="muted small">{r.reason}</td>
                <td><span className={STATUS[r.status] ?? 'badge'}>{r.status}</span></td>
                {canReview && (
                  <td>
                    {r.status === 'pending' && (
                      <span style={{ display: 'inline-flex', gap: 6 }}>
                        <button className="btn btn-sm btn-primary" title="Setujui" onClick={() => { void review(r.id, true); }}><Check size={13} /></button>
                        <button className="btn btn-sm btn-ghost" title="Tolak" onClick={() => { void review(r.id, false); }}><X size={13} /></button>
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={canReview ? 6 : 4} className="muted">Belum ada pengajuan koreksi.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Kapan perlu koreksi?</h3>
        <p className="muted small" style={{ marginTop: 8 }}>
          Lupa clock-in/out, salah lokasi saat absen, atau jam tercatat tidak sesuai kenyataan.
          Setelah disetujui atasan, absensi diperbarui dan perubahannya tercatat di audit log.
          Jika periode bulan itu sudah dikunci payroll, hubungi admin untuk membuka kunci.
        </p>
      </div>
    </div>
  );
}
