import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, MapPin, Plus, ChevronDown, X, Search, Download, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api, ApiError, PTKP_OPTIONS, type Site } from '../api';
import LocationPicker from './LocationPicker';

export default function EmployeesTab({ sites, onSitesChanged }: {
  sites: Site[]; onSitesChanged: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'employee', reportsTo: '', baseSalary: '', hireDate: '', npwp: '' });
  const [salaryDraft, setSalaryDraft] = useState<Record<string, string>>({});
  const [ptkpDraft, setPtkpDraft] = useState<Record<string, string>>({});
  const [contractDraft, setContractDraft] = useState<Record<string, string>>({});
  const [hireDraft, setHireDraft] = useState<Record<string, string>>({});
  const [npwpDraft, setNpwpDraft] = useState<Record<string, string>>({});
  const [siteForm, setSiteForm] = useState({ name: '', lat: '', lng: '', radiusM: '150', address: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Form default tertutup — tabel dulu; terbuka lewat tombol "+ Tambah".
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [showSiteForm, setShowSiteForm] = useState(false);
  // Tab dalam halaman: fokus 1 bagian per tab (Karyawan / Lokasi Absen).
  const [tab, setTab] = useState<'emp' | 'sites'>('emp');

  // ── Import Excel/CSV ──
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ summary: { created: number; skipped: number; failed: number }; results: { email: string; status: string; message: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({ queryKey: ['employees'], queryFn: () => api.employees() });
  const employees = data?.employees ?? [];

  const reload = (): void => {
    void qc.invalidateQueries({ queryKey: ['employees'] });
    void qc.invalidateQueries({ queryKey: ['summary'] });
  };

  const addEmployee = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.createEmployee({ ...form, reportsTo: form.reportsTo || undefined, baseSalary: form.baseSalary ? Number(form.baseSalary) : undefined, hireDate: form.hireDate || undefined, npwp: form.npwp || undefined });
      setForm({ name: '', email: '', phone: '', password: '', role: 'employee', reportsTo: '', baseSalary: '', hireDate: '', npwp: '' });
      setShowEmpForm(false);
      reload();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Gagal.'); } finally { setBusy(false); }
  };

  /** File dipilih: XLSX → CSV (SheetJS), CSV langsung → kirim ke server. */
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true); setError(''); setImportResult(null);
    try {
      let csv = '';
      if (file.name.toLowerCase().endsWith('.csv')) {
        csv = await file.text();
      } else {
        const XLSX = await import('xlsx');
        const wb = XLSX.read(await file.arrayBuffer());
        csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
      }
      const res = await api.importEmployees(csv);
      setImportResult(res);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memproses file import.');
    } finally { setImporting(false); }
  };

  const removeEmployee = async (email: string): Promise<void> => {
    if (!window.confirm(`Hapus ${email}? Riwayat absensinya tetap tersimpan.`)) return;
    try { await api.deleteEmployee(email); reload(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Gagal.'); }
  };

  const saveSalary = async (email: string): Promise<void> => {
    const raw = salaryDraft[email];
    const ptkp = ptkpDraft[email];
    const contract = contractDraft[email];
    const hire = hireDraft[email];
    const npwp = npwpDraft[email];
    if (raw === undefined && ptkp === undefined && contract === undefined && hire === undefined && npwp === undefined) return;
    try {
      await api.setBaseSalary(
        email,
        Number(raw ?? employees.find((x) => x.email === email)?.baseSalary ?? 0),
        ptkp,
        contract, // '' = hapus tanggal kontrak (→ alert berhenti)
        hire,     // '' = hapus tanggal masuk kerja (→ THR tidak dihitung)
        npwp,     // '' = hapus NPWP
      );
      setSalaryDraft((d) => { const n = { ...d }; delete n[email]; return n; });
      setPtkpDraft((d) => { const n = { ...d }; delete n[email]; return n; });
      setContractDraft((d) => { const n = { ...d }; delete n[email]; return n; });
      setHireDraft((d) => { const n = { ...d }; delete n[email]; return n; });
      setNpwpDraft((d) => { const n = { ...d }; delete n[email]; return n; });
      reload();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Gagal menyimpan gaji.'); }
  };

  const addSite = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.createSite({ name: siteForm.name, lat: Number(siteForm.lat), lng: Number(siteForm.lng), radiusM: Number(siteForm.radiusM), address: siteForm.address || undefined });
      setSiteForm({ name: '', lat: '', lng: '', radiusM: '150', address: '' });
      setShowSiteForm(false);
      onSitesChanged();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Gagal.'); } finally { setBusy(false); }
  };

  const useMyLocation = (): void => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setSiteForm((s) => ({ ...s, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }));
    }, () => setError('Gagal mengambil lokasi — izinkan akses GPS.'));
  };

  // Pencarian alamat (Nominatim / OpenStreetMap — gratis, tanpa API key).
  const searchAddress = async (): Promise<void> => {
    if (!siteForm.address.trim()) return;
    setError('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(siteForm.address)}`);
      const hits = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      if (!hits.length) { setError('Alamat tidak ditemukan — coba kata kunci lain.'); return; }
      setSiteForm((s) => ({ ...s, lat: Number(hits[0].lat).toFixed(6), lng: Number(hits[0].lon).toFixed(6) }));
    } catch { setError('Pencarian alamat gagal — periksa koneksi.'); }
  };

  return (
    <>
      <div className="page-tabs" role="tablist" aria-label="Bagian menu Karyawan">
        <button role="tab" aria-selected={tab === 'emp'} onClick={() => setTab('emp')}>
          Karyawan <span className="pt-count">{employees.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'sites'} onClick={() => setTab('sites')}>
          <MapPin size={14} /> Lokasi Absen <span className="pt-count">{sites.length}</span>
        </button>
      </div>

      {tab === 'emp' && (
      <div className="card">
        <div className="form-toggle-row">
          <h2>Karyawan ({employees.length})</h2>
          <button className={`btn btn-sm ${showEmpForm ? 'btn-ghost' : 'btn-primary'}`} onClick={() => setShowEmpForm((v) => !v)}>
            {showEmpForm ? <><X size={14} /> Tutup</> : <><Plus size={14} /> Tambah Karyawan</>}
          </button>
        </div>
        {showEmpForm && (
          <form className="inline-form form-panel" onSubmit={(e) => { void addEmployee(e); }}>
            <input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input placeholder="Sandi awal (min 8)" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="role-select">
              <option value="employee">Karyawan</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <select value={form.reportsTo} onChange={(e) => setForm({ ...form, reportsTo: e.target.value })} className="role-select">
              <option value="">Atasan langsung (opsional)</option>
              {employees.filter((x) => x.role !== 'employee').map((x) => (
                <option key={x.email} value={x.email}>{x.name} ({x.role})</option>
              ))}
            </select>
            <input placeholder="Gaji pokok/bulan (opsional, Rp)" type="number" min={0} value={form.baseSalary}
              onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
            <input type="date" title="Tanggal masuk kerja — dasar hitung THR" value={form.hireDate}
              onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
            <input placeholder="NPWP (opsional, 15–16 digit)" type="text" inputMode="numeric" value={form.npwp}
              onChange={(e) => setForm({ ...form, npwp: e.target.value })} />
            <button className="btn btn-primary" disabled={busy}><Plus size={14} /> Simpan Karyawan</button>
          </form>
        )}

        {/* ── Import massal Excel/CSV ── */}
        <div className="import-row">
          <button className="btn btn-secondary btn-sm" onClick={() => { void api.importTemplate(); }}>
            <Download size={14} /> Unduh Template Excel
          </button>
          <button className="btn btn-ghost btn-sm" disabled={importing} onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} /> {importing ? 'Memproses…' : 'Import Excel / CSV'}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { void handleImportFile(e); }} />
        </div>
        {importResult && (
          <div className="import-result">
            <div className="import-summary">
              <span className="ok-text"><CheckCircle2 size={14} /> {importResult.summary.created} dibuat</span>
              {importResult.summary.skipped > 0 && <span className="muted">· {importResult.summary.skipped} dilewati</span>}
              {importResult.summary.failed > 0 && <span className="text-danger"><AlertTriangle size={14} /> {importResult.summary.failed} gagal</span>}
            </div>
            <ul>
              {importResult.results.filter((r) => r.status !== 'created').slice(0, 8).map((r) => (
                <li key={r.email}><strong>{r.email}</strong> — {r.message}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="table-scroll">
        <table className="table">
          <thead><tr><th>Nama</th><th>Email</th><th className="center">Hadir</th><th>Gaji / PTKP</th><th>Kontrak s/d</th><th>Masuk Kerja</th><th>NPWP</th><th /></tr></thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.email}>
                <td>{e.name} <span className="badge">{e.role === 'owner' ? 'Owner' : e.role === 'admin' ? 'Admin' : e.role === 'manager' ? 'Manager' : 'Karyawan'}</span>
                  {e.reportsTo && <div className="muted small">atasan: {employees.find((x) => x.email === e.reportsTo)?.name ?? e.reportsTo}</div>}
                </td>
                <td className="muted cell-ellipsis" title={e.email}>{e.email}</td>
                <td style={{ textAlign: 'center' }}>{e.totalHadir ?? 0}</td>
                <td>
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <input type="number" min={0} step={100000} style={{ width: 124 }}
                      value={salaryDraft[e.email] ?? String(e.baseSalary ?? 0)}
                      onChange={(ev) => setSalaryDraft((d) => ({ ...d, [e.email]: ev.target.value }))}
                      onBlur={() => { void saveSalary(e.email); }}
                      onKeyDown={(ev) => { if (ev.key === 'Enter') { void saveSalary(e.email); } }}
                      title="Gaji pokok bulanan — dipakai payroll (tersimpan otomatis)"
                    />
                    <select style={{ width: 80 }} value={ptkpDraft[e.email] ?? e.ptkp ?? 'TK/0'}
                      onChange={(ev) => { setPtkpDraft((d) => ({ ...d, [e.email]: ev.target.value })); }}
                      onBlur={() => { void saveSalary(e.email); }}
                      title="Status PTKP — dipakai kategori TER PPh 21">
                      {PTKP_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </span>
                </td>
                <td>
                  <input type="date" style={{ width: 132 }}
                    value={contractDraft[e.email] ?? e.contractEndDate ?? ''}
                    onChange={(ev) => setContractDraft((d) => ({ ...d, [e.email]: ev.target.value }))}
                    onBlur={() => { void saveSalary(e.email); }}
                    title="Tanggal akhir kontrak PKWT — alert H-60/30/14 dikirim otomatis ke admin"
                  />
                </td>
                <td>
                  <input type="date" style={{ width: 132 }}
                    value={hireDraft[e.email] ?? e.hireDate ?? ''}
                    onChange={(ev) => setHireDraft((d) => ({ ...d, [e.email]: ev.target.value }))}
                    onBlur={() => { void saveSalary(e.email); }}
                    title="Tanggal masuk kerja — dasar hitung THR prorata (BR-13)"
                  />
                </td>
                <td>
                  <input type="text" inputMode="numeric" placeholder="15–16 digit" style={{ width: 132 }}
                    value={npwpDraft[e.email] ?? e.npwp ?? ''}
                    onChange={(ev) => setNpwpDraft((d) => ({ ...d, [e.email]: ev.target.value }))}
                    onBlur={() => { void saveSalary(e.email); }}
                    title="NPWP karyawan — otomatis masuk rekap SPT Masa PPh 21 & 1721-A1"
                  />
                </td>
                <td>{e.role === 'employee' && <button className="icon-btn" aria-label={`Hapus karyawan ${e.name}`} title="Hapus karyawan" onClick={() => { void removeEmployee(e.email); }}><Trash2 size={14} /></button>}</td>
              </tr>
            ))}
            {employees.length === 0 && <tr><td colSpan={8} className="muted">Belum ada karyawan — klik “Tambah Karyawan”.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
      )}

      {tab === 'sites' && (
      <div className="card">
        <div className="form-toggle-row">
          <h2><MapPin size={18} /> Lokasi Absen</h2>
          <button className={`btn btn-sm ${showSiteForm ? 'btn-ghost' : 'btn-primary'}`} onClick={() => setShowSiteForm((v) => !v)}>
            {showSiteForm ? <><X size={14} /> Tutup</> : <><Plus size={14} /> Tambah Lokasi</>}
          </button>
        </div>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="table">
            <thead><tr><th>Nama Lokasi</th><th className="num">Radius</th><th>Alamat</th><th /></tr></thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.name}</b></td>
                  <td className="num">{s.radiusM} m</td>
                  <td className="muted">{s.address || '—'}</td>
                  <td>
                    <button className="icon-btn" aria-label={`Hapus lokasi ${s.name}`} title="Hapus lokasi" onClick={() => { void api.deleteSite(s.id).then(onSitesChanged); }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {sites.length === 0 && <tr><td colSpan={4} className="table-empty">Belum ada lokasi absen — klik “Tambah Lokasi”.</td></tr>}
            </tbody>
          </table>
        </div>
        {showSiteForm && (
          <form className="grid-form form-panel" onSubmit={(e) => { void addSite(e); }}>
            <input placeholder="Nama lokasi (mis. Kantor Pusat)" value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} required />
            <div className="coord-row">
              <input placeholder="Alamat (klik ikon untuk cari)" value={siteForm.address} onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void searchAddress(); } }} />
              <button type="button" className="btn btn-ghost" onClick={() => { void searchAddress(); }}><Search size={14} /> Cari</button>
            </div>
            <LocationPicker
              lat={siteForm.lat === '' ? -6.2 : Number(siteForm.lat)}
              lng={siteForm.lng === '' ? 106.816666 : Number(siteForm.lng)}
              radiusM={Number(siteForm.radiusM) || 150}
              onChange={(lat, lng) => setSiteForm((s) => ({ ...s, lat: lat.toFixed(6), lng: lng.toFixed(6) }))}
            />
            <div className="coord-row">
              <input placeholder="Latitude" value={siteForm.lat} onChange={(e) => setSiteForm({ ...siteForm, lat: e.target.value })} required />
              <input placeholder="Longitude" value={siteForm.lng} onChange={(e) => setSiteForm({ ...siteForm, lng: e.target.value })} required />
            </div>
            <div className="coord-row">
              <input placeholder="Radius (meter)" type="number" min={20} max={2000} value={siteForm.radiusM} onChange={(e) => setSiteForm({ ...siteForm, radiusM: e.target.value })} />
              <button type="button" className="btn btn-ghost" onClick={useMyLocation}>Pakai Lokasi Saya</button>
            </div>
            <button className="btn btn-primary" disabled={busy}><Plus size={14} /> Simpan Lokasi</button>
          </form>
        )}
        {!showSiteForm && (
          <p className="muted small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ChevronDown size={13} /> Klik “Tambah Lokasi” untuk mendaftarkan titik absen baru.
          </p>
        )}
      </div>
      )}

      {error && <div className="error-box">{error}</div>}
    </>
  );
}
