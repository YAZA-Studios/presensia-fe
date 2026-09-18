import { useEffect, useState } from 'react';
import { Trash2, MapPin, Plus } from 'lucide-react';
import { api, ApiError, type Employee, type Site } from '../api';

export default function EmployeesTab({ sites, onSitesChanged }: {
  sites: Site[]; onSitesChanged: () => void;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [siteForm, setSiteForm] = useState({ name: '', lat: '', lng: '', radiusM: '150', address: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = (): void => { api.employees().then((r) => setEmployees(r.employees)).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const addEmployee = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.createEmployee({ ...form, role: 'employee' });
      setForm({ name: '', email: '', phone: '', password: '' });
      load();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Gagal.'); } finally { setBusy(false); }
  };

  const removeEmployee = async (email: string): Promise<void> => {
    if (!window.confirm(`Hapus ${email}? Riwayat absensinya tetap tersimpan.`)) return;
    try { await api.deleteEmployee(email); load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Gagal.'); }
  };

  const addSite = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.createSite({ name: siteForm.name, lat: Number(siteForm.lat), lng: Number(siteForm.lng), radiusM: Number(siteForm.radiusM), address: siteForm.address || undefined });
      setSiteForm({ name: '', lat: '', lng: '', radiusM: '150', address: '' });
      onSitesChanged();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Gagal.'); } finally { setBusy(false); }
  };

  const useMyLocation = (): void => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setSiteForm((s) => ({ ...s, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }));
    }, () => setError('Gagal mengambil lokasi — izinkan akses GPS.'));
  };

  return (
    <div className="two-col">
      <div className="card">
        <h2>Karyawan ({employees.length})</h2>
        <form className="inline-form" onSubmit={(e) => { void addEmployee(e); }}>
          <input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input placeholder="Sandi awal (min 8)" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          <button className="btn btn-primary" disabled={busy}><Plus size={14} /> Tambah</button>
        </form>
        <table className="table">
          <thead><tr><th>Nama</th><th>Email</th><th>Hadir</th><th /></tr></thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.email}>
                <td>{e.name} {e.role !== 'employee' && <span className="badge">{e.role === 'owner' ? 'Owner' : 'Admin'}</span>}</td>
                <td className="muted">{e.email}</td>
                <td>{e.totalHadir ?? 0}</td>
                <td>{e.role === 'employee' && <button className="icon-btn" onClick={() => { void removeEmployee(e.email); }}><Trash2 size={14} /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2><MapPin size={18} /> Lokasi Absen</h2>
        <ul className="site-list">
          {sites.map((s) => (
            <li key={s.id}>
              <div><strong>{s.name}</strong> <span className="muted">radius {s.radiusM} m</span>
                {s.address && <div className="muted small">{s.address}</div>}</div>
              <button className="icon-btn" onClick={() => { void api.deleteSite(s.id).then(onSitesChanged); }}><Trash2 size={14} /></button>
            </li>
          ))}
          {sites.length === 0 && <li className="muted">Belum ada lokasi.</li>}
        </ul>
        <form className="grid-form" onSubmit={(e) => { void addSite(e); }}>
          <input placeholder="Nama lokasi (mis. Kantor Pusat)" value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} required />
          <div className="coord-row">
            <input placeholder="Latitude" value={siteForm.lat} onChange={(e) => setSiteForm({ ...siteForm, lat: e.target.value })} required />
            <input placeholder="Longitude" value={siteForm.lng} onChange={(e) => setSiteForm({ ...siteForm, lng: e.target.value })} required />
          </div>
          <div className="coord-row">
            <input placeholder="Radius (meter)" type="number" min={20} max={2000} value={siteForm.radiusM} onChange={(e) => setSiteForm({ ...siteForm, radiusM: e.target.value })} />
            <button type="button" className="btn btn-ghost" onClick={useMyLocation}>Pakai Lokasi Saya</button>
          </div>
          <input placeholder="Alamat (opsional)" value={siteForm.address} onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })} />
          <button className="btn btn-primary" disabled={busy}><Plus size={14} /> Tambah Lokasi</button>
        </form>
      </div>
      {error && <div className="error-box">{error}</div>}
    </div>
  );
}
