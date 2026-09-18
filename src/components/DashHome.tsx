import { useEffect, useState } from 'react';
import { Clock, MapPin, Users } from 'lucide-react';
import { api, type Site, type Summary } from '../api';
import type { Me } from '../App';

/** Halaman Dashboard setelah login — welcome, clock-in besar, status hari ini,
 *  peta geofence, dan ringkasan tim (admin). */
export default function DashHome({ me, sites, goClock, today, onClocked }: {
  me: Me; sites: Site[]; goClock: () => void; today: string; onClocked: () => Promise<void>;
}) {
  const [att, setAtt] = useState<{ clockInAt: string | null; clockOutAt: string | null; status: string } | null>(null);
  const [sum, setSum] = useState<Summary | null>(null);
  const isAdmin = me.role !== 'employee';

  useEffect(() => {
    api.today().then((r) => setAtt(r.attendance)).catch(() => {});
    if (isAdmin) api.summary().then(setSum).catch(() => {});
  }, [isAdmin]);

  const site = sites[0];
  const status = att ? (att.status === 'present' ? 'Present' : att.status === 'late' ? 'Late' : att.status) : 'Belum absen';
  const statusCls = att?.status === 'present' ? '' : att?.status === 'late' ? 'late' : 'absent';
  const inT = att?.clockInAt ? new Date(att.clockInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—';
  const outT = att?.clockOutAt ? new Date(att.clockOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <>
      <h1 className="welcome-title">Welcome, {me.name}!</h1>
      <p className="muted" style={{ marginBottom: 20 }}>{today}</p>

      <div className="home-grid">
        <div>
          <div className="card clocknow-card">
            <button className="btn btn-primary clock-btn-big" onClick={goClock}>
              <Clock size={19} /> {att?.clockInAt && att?.clockOutAt ? 'Lihat Absensi' : 'Clock-in Now'}
            </button>
          </div>

          <div className="card today-card">
            <h3>My Attendance Today</h3>
            <div className={`today-status ${att ? statusCls : ''}`}>{att ? status : '—'}</div>
            <div className="today-meta">
              <div><b>{inT}</b><span>Clock-in</span></div>
              <div><b>{outT}</b><span>Clock-out</span></div>
            </div>
            {att?.clockInAt && !att.clockOutAt && (
              <button className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={() => { void onClocked(); goClock(); }}>
                Clock-out sekarang
              </button>
            )}
          </div>

          {isAdmin && sum && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3><Users size={16} /> Team Attendance</h3>
              <div className="team-mini">
                <div><b>{sum.today.present}</b><span>Present</span></div>
                <div><b>{sum.today.late}</b><span>Late</span></div>
                <div><b>{sum.today.leave}</b><span>Leave/Sick</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="card geo-card">
          <h3><MapPin size={16} /> Current Geofencing Status</h3>
          <div className="geo-map">
            <div className="geo-map-grid" />
            <div className="geo-fence" />
            <span className="geo-label">
              {site ? `📍 ${site.name} · radius ${site.radiusM} m` : 'Belum ada lokasi absen terdaftar'}
            </span>
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>
            Interactive radius — absensi hanya diterima dalam lingkaran ini; jarak diverifikasi di server.
          </p>
        </div>
      </div>
    </>
  );
}
