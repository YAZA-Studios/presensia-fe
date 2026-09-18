import { useEffect, useState } from 'react';
import { Save, ArrowRightLeft, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { api, ApiError, type OrgPolicy, type Delegation, type Employee } from '../api';

const TIMEZONES = [
  'Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'Asia/Singapore', 'Asia/Kuala_Lumpur', 'UTC',
];

export default function SettingsTab({ me }: { me: { role: string; email: string } }) {
  const [policy, setPolicy] = useState<OrgPolicy | null>(null);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [delForm, setDelForm] = useState({ fromEmail: '', toEmail: '', dateFrom: '', dateTo: '' });
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const isOwner = me.role === 'owner' || me.role === 'admin';

  useEffect(() => {
    api.policy().then((r) => setPolicy(r.policy)).catch(() => {});
    api.delegations().then((r) => setDelegations(r.delegations)).catch(() => {});
    if (isOwner) api.employees().then((r) => setEmployees(r.employees)).catch(() => {});
  }, [isOwner]);

  const savePolicy = async (): Promise<void> => {
    if (!policy) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api.updatePolicy(policy);
      setPolicy(r.policy);
      setMsg({ ok: true, text: 'Kebijakan tersimpan — langsung berlaku di server.' });
    } catch (err) { setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Gagal menyimpan.' }); }
    finally { setBusy(false); }
  };

  const addDelegation = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await api.createDelegation(delForm);
      setDelForm({ fromEmail: '', toEmail: '', dateFrom: '', dateTo: '' });
      api.delegations().then((r) => setDelegations(r.delegations)).catch(() => {});
      setMsg({ ok: true, text: 'Delegasi dibuat — wakil bisa menyetujui pengajuan selama rentang tanggal itu.' });
    } catch (err) { setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Gagal membuat delegasi.' }); }
    finally { setBusy(false); }
  };

  if (!policy) return <div className="card"><p className="muted">Memuat pengaturan…</p></div>;

  const managers = employees.filter((x) => x.role !== 'employee');

  return (
    <div className="two-col">
      <div className="card">
        <h2><ShieldCheck size={18} /> Kebijakan Organisasi</h2>
        <p className="muted small">Aturan ini dipakai engine absensi, timesheet payroll, dan approval berjenjang.</p>
        <div className="grid-form">
          <label className="mini">Zona waktu cabang
            <select value={policy.timezone} onChange={(e) => setPolicy({ ...policy, timezone: e.target.value })}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </label>
          <div className="coord-row">
            <label className="mini">Istirahat otomatis (menit/hari)
              <input type="number" min={0} max={240} value={policy.breakMinutes}
                onChange={(e) => setPolicy({ ...policy, breakMinutes: Number(e.target.value) })} />
            </label>
            <label className="mini">Cuti ≥ N hari → approval HR
              <input type="number" min={1} max={30} value={policy.twoTierApprovalDays}
                onChange={(e) => setPolicy({ ...policy, twoTierApprovalDays: Number(e.target.value) })} />
            </label>
          </div>
          <div className="coord-row">
            <label className="mini">Lembur minimal (menit)
              <input type="number" min={0} max={120} value={policy.overtime.minMinutes}
                onChange={(e) => setPolicy({ ...policy, overtime: { ...policy.overtime, minMinutes: Number(e.target.value) } })} />
            </label>
            <label className="mini">Pembulatan lembur (menit)
              <input type="number" min={5} max={60} value={policy.overtime.roundToMinutes}
                onChange={(e) => setPolicy({ ...policy, overtime: { ...policy.overtime, roundToMinutes: Number(e.target.value) } })} />
            </label>
          </div>
          <div className="coord-row">
            <label className="mini">Multiplier hari kerja
              <input type="number" step="0.5" min={1} max={3} value={policy.overtime.multiplierWorkday}
                onChange={(e) => setPolicy({ ...policy, overtime: { ...policy.overtime, multiplierWorkday: Number(e.target.value) } })} />
            </label>
            <label className="mini">Multiplier hari libur
              <input type="number" step="0.5" min={1} max={4} value={policy.overtime.multiplierHoliday}
                onChange={(e) => setPolicy({ ...policy, overtime: { ...policy.overtime, multiplierHoliday: Number(e.target.value) } })} />
            </label>
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={() => { void savePolicy(); }}>
            <Save size={14} /> {busy ? 'Menyimpan…' : 'Simpan Kebijakan'}
          </button>
        </div>

        <h3 style={{ marginTop: 20 }}><FileSpreadsheet size={16} /> Ekspor Timesheet Payroll</h3>
        <p className="muted small">Kolom siap payroll: jam kotor, istirahat, jam bersih, menit telat, lembur (+multiplier libur).</p>
        <div className="export-row">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="month-input" />
          <button className="btn btn-secondary" onClick={() => api.exportTimesheet(month)}>Unduh CSV Payroll</button>
        </div>
        {msg && <div className={msg.ok ? 'ok-box' : 'error-box'}>{msg.text}</div>}
      </div>

      <div className="card">
        <h2><ArrowRightLeft size={18} /> Delegasi Wewenang</h2>
        <p className="muted small">Saat manager cuti/dinas luar, hak approve-nya dipindahkan ke wakil selama rentang tanggal tertentu.</p>
        {managers.length >= 2 ? (
          <form className="grid-form" onSubmit={(e) => { void addDelegation(e); }}>
            <select value={delForm.fromEmail} onChange={(e) => setDelForm({ ...delForm, fromEmail: e.target.value })} required>
              <option value="">Dari (manager yang absent)</option>
              {managers.map((m) => <option key={m.email} value={m.email}>{m.name} ({m.role})</option>)}
            </select>
            <select value={delForm.toEmail} onChange={(e) => setDelForm({ ...delForm, toEmail: e.target.value })} required>
              <option value="">Kepada (wakil)</option>
              {managers.filter((m) => m.email !== delForm.fromEmail).map((m) => <option key={m.email} value={m.email}>{m.name} ({m.role})</option>)}
            </select>
            <div className="coord-row">
              <label className="mini">Mulai<input type="date" value={delForm.dateFrom} onChange={(e) => setDelForm({ ...delForm, dateFrom: e.target.value })} required /></label>
              <label className="mini">Selesai<input type="date" value={delForm.dateTo} onChange={(e) => setDelForm({ ...delForm, dateTo: e.target.value })} required /></label>
            </div>
            <button className="btn btn-primary" disabled={busy}><ArrowRightLeft size={14} /> Buat Delegasi</button>
          </form>
        ) : <p className="muted">Butuh minimal 2 pengguna manager/admin untuk delegasi. Tambahkan dari menu Karyawan.</p>}

        <h3 style={{ marginTop: 18 }}>Delegasi Aktif</h3>
        <table className="table">
          <thead><tr><th>Dari</th><th>Kepada</th><th>Periode</th></tr></thead>
          <tbody>
            {delegations.map((d) => (
              <tr key={d.id}>
                <td>{employees.find((x) => x.email === d.fromEmail)?.name ?? d.fromEmail}</td>
                <td>{employees.find((x) => x.email === d.toEmail)?.name ?? d.toEmail}</td>
                <td className="muted">{d.dateFrom} → {d.dateTo}</td>
              </tr>
            ))}
            {delegations.length === 0 && <tr><td colSpan={3} className="muted">Belum ada delegasi.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
