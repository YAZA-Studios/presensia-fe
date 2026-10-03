import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowRightLeft, FileSpreadsheet, ShieldCheck, Plus, X, CalendarDays, Trash2 } from 'lucide-react';
import { api, ApiError, pct, type OrgPolicy, type BpjsConfig } from '../api';

const TIMEZONES = [
  'Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'Asia/Singapore', 'Asia/Kuala_Lumpur', 'UTC',
];

export default function SettingsTab({ me }: { me: { role: string; email: string } }) {
  const qc = useQueryClient();
  const [delForm, setDelForm] = useState({ fromEmail: '', toEmail: '', dateFrom: '', dateTo: '' });
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // Form delegasi default tertutup — daftar delegasi aktif dulu.
  const [showDelForm, setShowDelForm] = useState(false);
  // Form kebijakan default tertutup — tampil ringkasan nilai aktif dulu.
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  // Draf kebijakan (bekerja pada salinan agar tidak mengubah cache sebelum disimpan).
  const [draft, setDraft] = useState<OrgPolicy | null>(null);

  // Form hari libur — default TERTUTUP: tabel libur tampil dulu (table-first).
  const [holiday, setHoliday] = useState({ date: '', name: '' });
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  // Form konfigurasi BPJS — default TERTUTUP: ringkasan nilai aktif dulu.
  const [showBpjsForm, setShowBpjsForm] = useState(false);
  const year = String(new Date().getFullYear());
  // Form konfigurasi BPJS (tanpa deploy).
  const [bpjsDraft, setBpjsDraft] = useState<BpjsConfig | null>(null);
  const [bpjsMsg, setBpjsMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [bpjsBusy, setBpjsBusy] = useState(false);

  const isOwner = me.role === 'owner' || me.role === 'admin';

  const { data: policyData } = useQuery({ queryKey: ['policy'], queryFn: () => api.policy() });
  const { data: delData } = useQuery({ queryKey: ['delegations'], queryFn: () => api.delegations() });
  const { data: holData } = useQuery({ queryKey: ['holidays', year], queryFn: () => api.holidays(year), enabled: isOwner });
  const { data: bpjsData } = useQuery({ queryKey: ['bpjs-config'], queryFn: () => api.bpjsConfig(), enabled: isOwner });
  const { data: empData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.employees(),
    enabled: isOwner,
  });
  const policy = policyData?.policy ?? null;
  const delegations = delData?.delegations ?? [];
  const employees = empData?.employees ?? [];

  // Buka form → mulai dari nilai cache saat itu.
  useEffect(() => {
    if (showPolicyForm && policy && !draft) setDraft(policy);
  }, [showPolicyForm, policy, draft]);
  // Draft BPJS → sekali dari cache saat form DIBUKA, lalu dikelola lokal.
  useEffect(() => {
    if (showBpjsForm && bpjsData?.config && !bpjsDraft) setBpjsDraft(bpjsData.config);
  }, [showBpjsForm, bpjsData, bpjsDraft]);

  const savePolicy = async (): Promise<void> => {
    if (!draft) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api.updatePolicy(draft);
      qc.setQueryData(['policy'], { policy: r.policy });
      setDraft(null);
      setShowPolicyForm(false);
      setMsg({ ok: true, text: 'Kebijakan tersimpan — langsung berlaku di server.' });
    } catch (err) { setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Gagal menyimpan.' }); }
    finally { setBusy(false); }
  };

  const saveHoliday = async (remove = false): Promise<void> => {
    setBusy(true); setMsg(null);
    try {
      await api.saveHoliday({ date: holiday.date, name: holiday.name || undefined, remove });
      setHoliday({ date: '', name: '' });
      void qc.invalidateQueries({ queryKey: ['holidays'] });
      setMsg({ ok: true, text: remove ? 'Hari libur dihapus.' : 'Hari libur tersimpan — dipakai timesheet & payroll.' });
    } catch (err) { setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Gagal.' }); }
    finally { setBusy(false); }
  };

  const addDelegation = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await api.createDelegation(delForm);
      setDelForm({ fromEmail: '', toEmail: '', dateFrom: '', dateTo: '' });
      setShowDelForm(false);
      void qc.invalidateQueries({ queryKey: ['delegations'] });
      setMsg({ ok: true, text: 'Delegasi dibuat — wakil bisa menyetujui pengajuan selama rentang tanggal itu.' });
    } catch (err) { setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Gagal membuat delegasi.' }); }
    finally { setBusy(false); }
  };

  const saveBpjs = async (): Promise<void> => {
    if (!bpjsDraft) return;
    setBpjsBusy(true); setBpjsMsg(null);
    try {
      const r = await api.updateBpjsConfig(bpjsDraft);
      qc.setQueryData(['bpjs-config'], bpjsData ? { ...bpjsData, config: r.config } : undefined);
      setBpjsMsg({ ok: true, text: r.changed
        ? 'Konfigurasi BPJS tersimpan — payroll berikutnya memakai nilai baru (run lama tidak berubah).'
        : 'Tidak ada perubahan.' });
    } catch (err) { setBpjsMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Gagal menyimpan.' }); }
    finally { setBpjsBusy(false); }
  };

  /** Label kelas JKK dari tarif aktif (untuk ringkasan). */
  const jkkLabelOf = (rate: number): string => {
    const hit = bpjsData?.jkkClasses.find((c) => Math.abs(c.rate - rate) < 1e-9);
    return hit ? hit.label.split(' — ')[0]! : 'Kustom';
  };

  if (!policy) return <div className="card"><p className="muted">Memuat pengaturan…</p></div>;

  const managers = employees.filter((x) => x.role !== 'employee');
  const p = draft ?? policy;

  return (
    <div className="two-col">
      <div className="card">
        <div className="form-toggle-row">
          <h2><ShieldCheck size={18} /> Kebijakan Organisasi</h2>
          <button className={`btn btn-sm ${showPolicyForm ? 'btn-ghost' : 'btn-primary'}`} onClick={() => { setDraft(null); setShowPolicyForm((v) => !v); }}>
            {showPolicyForm ? <><X size={14} /> Tutup</> : <><Save size={14} /> Ubah Kebijakan</>}
          </button>
        </div>
        <p className="muted small">Aturan ini dipakai engine absensi, timesheet payroll, dan approval berjenjang.</p>
        {!showPolicyForm && (
          <p className="muted small policy-summary">
            Zona waktu <strong>{policy.timezone}</strong> · Istirahat <strong>{policy.breakMinutes} mnt</strong> · Lembur min <strong>{policy.overtime.minMinutes} mnt</strong> · GPS ±<strong>{policy.gps.maxAccuracyM} m</strong>
          </p>
        )}
        {showPolicyForm && <div className="grid-form form-panel">
          <label className="mini">Zona waktu cabang
            <select value={p.timezone} onChange={(e) => setDraft({ ...p, timezone: e.target.value })}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </label>
          <div className="coord-row">
            <label className="mini">Istirahat otomatis (menit/hari)
              <input type="number" min={0} max={240} value={p.breakMinutes}
                onChange={(e) => setDraft({ ...p, breakMinutes: Number(e.target.value) })} />
            </label>
            <label className="mini">Cuti ≥ N hari → approval HR
              <input type="number" min={1} max={30} value={p.leave.hrApprovalOverDays}
                onChange={(e) => setDraft({ ...p, leave: { ...p.leave, hrApprovalOverDays: Number(e.target.value) } })} />
            </label>
          </div>
          <div className="coord-row">
            <label className="mini">Lembur minimal (menit)
              <input type="number" min={0} max={120} value={p.overtime.minMinutes}
                onChange={(e) => setDraft({ ...p, overtime: { ...p.overtime, minMinutes: Number(e.target.value) } })} />
            </label>
            <label className="mini">Pembulatan lembur (menit)
              <input type="number" min={5} max={60} value={p.overtime.roundMinutes}
                onChange={(e) => setDraft({ ...p, overtime: { ...p.overtime, roundMinutes: Number(e.target.value) } })} />
            </label>
          </div>
          <div className="coord-row">
            <label className="mini">Multiplier hari kerja
              <input type="number" step="0.5" min={1} max={3} value={p.overtime.multiplierWeekday}
                onChange={(e) => setDraft({ ...p, overtime: { ...p.overtime, multiplierWeekday: Number(e.target.value) } })} />
            </label>
            <label className="mini">Multiplier hari libur
              <input type="number" step="0.5" min={1} max={4} value={p.overtime.multiplierHoliday}
                onChange={(e) => setDraft({ ...p, overtime: { ...p.overtime, multiplierHoliday: Number(e.target.value) } })} />
            </label>
          </div>
          <div className="coord-row">
            <label className="mini">Toleransi akurasi GPS (meter)
              <input type="number" min={20} max={2000} value={p.gps.maxAccuracyM}
                onChange={(e) => setDraft({ ...p, gps: { ...p.gps, maxAccuracyM: Number(e.target.value) } })} />
            </label>
            <label className="mini">Cek ketat IP vs lokasi
              <select value={p.gps.strictIpCheck ? 'on' : 'off'}
                onChange={(e) => setDraft({ ...p, gps: { ...p.gps, strictIpCheck: e.target.value === 'on' } })}>
                <option value="off">Tandai saja (rekomendasi)</option>
                <option value="on">Tolak bila jomplang</option>
              </select>
            </label>
          </div>
          <p className="muted small">Toleransi GPS = akurasi sinyal maksimal yang diterima server (default 100 m). Naikkan bila karyawan sering absen di dalam gedung; radius lokasi absen diatur terpisah di menu Karyawan.</p>
          <button className="btn btn-primary" disabled={busy} onClick={() => { void savePolicy(); }}>
            <Save size={14} /> {busy ? 'Menyimpan…' : 'Simpan Kebijakan'}
          </button>
        </div>}

        {isOwner && (
          <>
            <div className="form-toggle-row" style={{ marginTop: 20 }}>
              <h3><CalendarDays size={16} /> Hari Libur {year}</h3>
              <button className={`btn btn-sm ${showHolidayForm ? 'btn-ghost' : 'btn-primary'}`} onClick={() => { setHoliday({ date: '', name: '' }); setShowHolidayForm((v) => !v); }}>
                {showHolidayForm ? <><X size={14} /> Tutup</> : <><Plus size={14} /> Tambah Hari Libur</>}
              </button>
            </div>
            <p className="muted small">Libur nasional/cuti bersama — hari libur tidak dihitung lembur hari-kerja & dikecualikan dari hari kerja payroll.</p>
            {showHolidayForm && (
              <div className="grid-form form-panel">
                <div className="coord-row">
                  <label className="mini">Tanggal
                    <input type="date" value={holiday.date} onChange={(e) => setHoliday({ ...holiday, date: e.target.value })} />
                  </label>
                  <label className="mini">Nama (mis. Idul Fitri)
                    <input type="text" value={holiday.name} onChange={(e) => setHoliday({ ...holiday, name: e.target.value })} placeholder="Nama hari libur" />
                  </label>
                </div>
                <div className="review-btns">
                  <button className="btn btn-primary btn-sm" disabled={busy || !holiday.date} onClick={() => { void saveHoliday(false); }}><Plus size={13} /> Simpan</button>
                  {holiday.date && (
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { void saveHoliday(true); }}><Trash2 size={13} /> Hapus Tanggal Ini</button>
                  )}
                </div>
              </div>
            )}
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table className="table">
                <thead><tr><th>Tanggal</th><th>Nama</th></tr></thead>
                <tbody>
                  {(holData?.holidays ?? []).map((h) => (
                    <tr key={h.date}><td>{h.date}</td><td>{h.name}</td></tr>
                  ))}
                  {(holData?.holidays ?? []).length === 0 && <tr><td colSpan={2} className="table-empty">Belum ada hari libur untuk {year}.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        <h3 style={{ marginTop: 20 }}><FileSpreadsheet size={16} /> Ekspor Timesheet Payroll</h3>
        <p className="muted small">Kolom siap payroll: jam kotor, istirahat, jam bersih, menit telat, lembur (+multiplier libur).</p>
        <div className="export-row">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="month-input" />
          <button className="btn btn-secondary" onClick={() => api.exportTimesheet(month)}>Unduh CSV Payroll</button>
        </div>

        {isOwner && (
          <>
            <div className="form-toggle-row" style={{ marginTop: 20 }}>
              <h3>Konfigurasi BPJS (per organisasi)</h3>
              <button className={`btn btn-sm ${showBpjsForm ? 'btn-ghost' : 'btn-primary'}`} onClick={() => { setBpjsDraft(null); setBpjsMsg(null); setShowBpjsForm((v) => !v); }}>
                {showBpjsForm ? <><X size={14} /> Tutup</> : <><Save size={14} /> Ubah Konfigurasi</>}
              </button>
            </div>
            <p className="muted small">
              Tarif, kelas risiko JKK, dan plafon dipakai payroll berikutnya — tersimpan di server,
              tanpa deploy. Slip yang sudah final tidak berubah.
            </p>
            {!showBpjsForm && (
              bpjsData?.config ? (
                <div className="table-wrap" style={{ marginTop: 10 }}>
                  <table className="table">
                    <thead><tr><th>Komponen</th><th className="num">Perusahaan</th><th className="num">Karyawan</th></tr></thead>
                    <tbody>
                      <tr><td>JHT</td><td className="num">{pct(bpjsData.config.jhtCompany)}%</td><td className="num">{pct(bpjsData.config.jhtEmployee)}%</td></tr>
                      <tr><td>JP (plafon {new Intl.NumberFormat('id-ID').format(bpjsData.config.jpWageCap)})</td><td className="num">{pct(bpjsData.config.jpCompany)}%</td><td className="num">{pct(bpjsData.config.jpEmployee)}%</td></tr>
                      <tr><td>JKP</td><td className="num">{pct(bpjsData.config.jkpCompany)}%</td><td className="num">{pct(bpjsData.config.jkpEmployee)}%</td></tr>
                      <tr><td>JKM</td><td className="num">{pct(bpjsData.config.jkmCompany)}%</td><td className="num muted">—</td></tr>
                      <tr><td>JKK ({jkkLabelOf(bpjsData.config.jkkCompany)})</td><td className="num">{pct(bpjsData.config.jkkCompany)}%</td><td className="num muted">—</td></tr>
                      <tr><td>Kesehatan (plafon {new Intl.NumberFormat('id-ID').format(bpjsData.config.kesehatanWageCap)})</td><td className="num">{pct(bpjsData.config.kesehatanCompany)}%</td><td className="num">{pct(bpjsData.config.kesehatanEmployee)}%</td></tr>
                    </tbody>
                  </table>
                </div>
              ) : <p className="muted small" style={{ marginTop: 10 }}>Memuat konfigurasi…</p>
            )}
            {showBpjsForm && (!bpjsDraft ? <p className="muted">Memuat konfigurasi…</p> : (
              <div className="grid-form form-panel">
                <label className="mini">Kelas risiko JKK (perusahaan)
                  <select
                    value={(() => {
                      const hit = bpjsData?.jkkClasses.find((c) => Math.abs(c.rate - bpjsDraft.jkkCompany) < 1e-9);
                      return hit ? hit.id : 'custom';
                    })()}
                    onChange={(e) => {
                      const kelas = bpjsData?.jkkClasses.find((c) => c.id === e.target.value);
                      setBpjsDraft((d) => (d ? { ...d, jkkCompany: kelas ? kelas.rate : d.jkkCompany } : d));
                    }}>
                    {bpjsData?.jkkClasses.map((c) => (
                      <option key={c.id} value={c.id}>{c.label} — {(c.rate * 100).toFixed(2)}%</option>
                    ))}
                    <option value="custom">Kustom ({pct(bpjsDraft.jkkCompany)}%)</option>
                  </select>
                </label>
                <div className="coord-row">
                  <label className="mini">JHT perusahaan (%)<input type="number" step="0.01" min={0} max={100}
                    value={pct(bpjsDraft.jhtCompany)}
                    onChange={(e) => setBpjsDraft((d) => d ? { ...d, jhtCompany: Number(e.target.value) / 100 } : d)} /></label>
                  <label className="mini">JHT karyawan (%)<input type="number" step="0.01" min={0} max={100}
                    value={pct(bpjsDraft.jhtEmployee)}
                    onChange={(e) => setBpjsDraft((d) => d ? { ...d, jhtEmployee: Number(e.target.value) / 100 } : d)} /></label>
                </div>
                <div className="coord-row">
                  <label className="mini">JP perusahaan (%)<input type="number" step="0.01" min={0} max={100}
                    value={pct(bpjsDraft.jpCompany)}
                    onChange={(e) => setBpjsDraft((d) => d ? { ...d, jpCompany: Number(e.target.value) / 100 } : d)} /></label>
                  <label className="mini">JP karyawan (%)<input type="number" step="0.01" min={0} max={100}
                    value={pct(bpjsDraft.jpEmployee)}
                    onChange={(e) => setBpjsDraft((d) => d ? { ...d, jpEmployee: Number(e.target.value) / 100 } : d)} /></label>
                </div>
                <div className="coord-row">
                  <label className="mini">JKP perusahaan (%)<input type="number" step="0.01" min={0} max={100}
                    value={pct(bpjsDraft.jkpCompany)}
                    onChange={(e) => setBpjsDraft((d) => d ? { ...d, jkpCompany: Number(e.target.value) / 100 } : d)} /></label>
                  <label className="mini">JKP karyawan (%)<input type="number" step="0.01" min={0} max={100}
                    value={pct(bpjsDraft.jkpEmployee)}
                    onChange={(e) => setBpjsDraft((d) => d ? { ...d, jkpEmployee: Number(e.target.value) / 100 } : d)} /></label>
                </div>
                <div className="coord-row">
                  <label className="mini">JKM perusahaan (%)<input type="number" step="0.01" min={0} max={100}
                    value={pct(bpjsDraft.jkmCompany)}
                    onChange={(e) => setBpjsDraft((d) => d ? { ...d, jkmCompany: Number(e.target.value) / 100 } : d)} /></label>
                  <span className="muted small" style={{ alignSelf: 'end' }}>JKK/JKM tanpa plafon upah.</span>
                </div>
                <div className="coord-row">
                  <label className="mini">Kesehatan perusahaan (%)<input type="number" step="0.01" min={0} max={100}
                    value={pct(bpjsDraft.kesehatanCompany)}
                    onChange={(e) => setBpjsDraft((d) => d ? { ...d, kesehatanCompany: Number(e.target.value) / 100 } : d)} /></label>
                  <label className="mini">Kesehatan karyawan (%)<input type="number" step="0.01" min={0} max={100}
                    value={pct(bpjsDraft.kesehatanEmployee)}
                    onChange={(e) => setBpjsDraft((d) => d ? { ...d, kesehatanEmployee: Number(e.target.value) / 100 } : d)} /></label>
                </div>
                <div className="coord-row">
                  <label className="mini">Plafon upah JP (Rp)<input type="number" step={1000} min={0}
                    value={bpjsDraft.jpWageCap}
                    onChange={(e) => setBpjsDraft((d) => d ? { ...d, jpWageCap: Number(e.target.value) } : d)} /></label>
                  <label className="mini">Plafon upah Kesehatan (Rp)<input type="number" step={1000} min={0}
                    value={bpjsDraft.kesehatanWageCap}
                    onChange={(e) => setBpjsDraft((d) => d ? { ...d, kesehatanWageCap: Number(e.target.value) } : d)} /></label>
                </div>
                <div className="review-btns">
                  <button className="btn btn-primary btn-sm" disabled={bpjsBusy} onClick={() => { void saveBpjs(); }}>
                    <Save size={14} /> {bpjsBusy ? 'Menyimpan…' : 'Simpan BPJS'}
                  </button>
                  <button className="btn btn-ghost btn-sm" disabled={bpjsBusy}
                    onClick={() => setBpjsDraft(bpjsData ? bpjsData.defaults : null)}>
                    Kembalikan ke Default
                  </button>
                </div>
                {bpjsMsg && <div className={bpjsMsg.ok ? 'ok-box' : 'error-box'}>{bpjsMsg.text}</div>}
              </div>
            ))}
          </>
        )}
        {msg && <div className={msg.ok ? 'ok-box' : 'error-box'}>{msg.text}</div>}
      </div>

      <div className="card">
        <h2><ArrowRightLeft size={18} /> Delegasi Wewenang</h2>
        <p className="muted small">Saat manager cuti/dinas luar, hak approve-nya dipindahkan ke wakil selama rentang tanggal tertentu.</p>
        {managers.length >= 2 ? (
          <>
            <div className="form-toggle-row">
              <span className="muted small">Delegasi aktif: {delegations.length}</span>
              <button className={`btn btn-sm ${showDelForm ? 'btn-ghost' : 'btn-primary'}`} onClick={() => setShowDelForm((v) => !v)}>
                {showDelForm ? <><X size={14} /> Tutup</> : <><Plus size={14} /> Buat Delegasi</>}
              </button>
            </div>
            {showDelForm && <form className="grid-form form-panel" onSubmit={(e) => { void addDelegation(e); }}>
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
              <button className="btn btn-primary" disabled={busy}><ArrowRightLeft size={14} /> Simpan Delegasi</button>
            </form>}
          </>
        ) : <p className="muted">Butuh minimal 2 pengguna manager/admin untuk delegasi. Tambahkan dari menu Karyawan.</p>}

        <h3 style={{ marginTop: 18 }}>Delegasi Aktif</h3>
        <div className="table-wrap">
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
              {delegations.length === 0 && <tr><td colSpan={3} className="table-empty">Belum ada delegasi.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
