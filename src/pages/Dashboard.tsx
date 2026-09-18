import { useEffect, useState } from 'react';
import { Clock, Users, CalendarDays, CreditCard, LogOut } from 'lucide-react';
import { api, type Site, type Employee, type Leave, type HistoryRow, type Plan, type Invoice } from '../api';
import type { Me } from '../App';
import ClockCard from '../components/ClockCard';
import EmployeesTab from '../components/EmployeesTab';
import LeavesTab from '../components/LeavesTab';
import HistoryTab from '../components/HistoryTab';
import BillingTab from '../components/BillingTab';

type Tab = 'clock' | 'history' | 'employees' | 'leaves' | 'billing';

export default function Dashboard({ me, onLogout, refreshMe }: {
  me: Me; onLogout: () => void; refreshMe: () => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>('clock');
  const [sites, setSites] = useState<Site[]>([]);
  const isAdmin = me.role !== 'employee';

  useEffect(() => {
    api.sites().then((r) => setSites(r.sites)).catch(() => {});
  }, []);

  const tabs: { id: Tab; label: string; icon?: React.ReactNode }[] = [
    { id: 'clock', label: 'Absen', icon: <Clock size={16} /> },
    { id: 'history', label: 'Rekap', icon: <CalendarDays size={16} /> },
    ...(isAdmin ? [
      { id: 'employees' as Tab, label: 'Karyawan', icon: <Users size={16} /> },
      { id: 'leaves' as Tab, label: 'Izin', icon: <CalendarDays size={16} /> },
      { id: 'billing' as Tab, label: 'Langganan', icon: <CreditCard size={16} /> },
    ] : [{ id: 'leaves' as Tab, label: 'Izin Saya', icon: <CalendarDays size={16} /> }]),
  ];

  return (
    <div className="dash">
      <header className="nav dash-nav">
        <div className="brand"><span className="brand-mark">✓</span> Hadirku
          <span className="org-chip">{me.org.name}</span>
        </div>
        <div className="nav-user">
          <span className="muted">{me.name} · {me.role === 'owner' ? 'Owner' : me.role === 'admin' ? 'Admin' : 'Karyawan'}</span>
          <button className="btn btn-ghost" onClick={() => { void onLogout(); }}><LogOut size={14} /> Keluar</button>
        </div>
      </header>

      {me.org.plan === 'trial' && me.org.planExpiresAt && (
        <div className="trial-banner">
          Masa uji coba sampai {new Date(me.org.planExpiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          {sites.length === 0 && ' · belum ada lokasi absen — admin perlu menambahkan lokasi di menu Karyawan'}
        </div>
      )}

      <nav className="tabs">
        {tabs.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'tab-active' : ''}`} onClick={() => setTab(t.id)}>
            {t.icon}{t.label}
          </button>
        ))}
      </nav>

      <main className="dash-main">
        {tab === 'clock' && <ClockCard me={me} sites={sites} onClocked={refreshMe} />}
        {tab === 'history' && <HistoryTab me={me} />}
        {tab === 'employees' && <EmployeesTab sites={sites} onSitesChanged={() => api.sites().then((r) => setSites(r.sites)).catch(() => {})} />}
        {tab === 'leaves' && <LeavesTab me={me} />}
        {tab === 'billing' && <BillingTab me={me} />}
      </main>
    </div>
  );
}

export type { Employee, Leave, HistoryRow, Plan, Invoice };
