import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, ScanFace, Plane, FileBarChart2,
  FileSpreadsheet, Settings, CreditCard, LogOut, Users,
  ChevronsLeft, ChevronsRight, Clock, FileClock,
} from 'lucide-react';
import { api, type Site } from '../api';
import type { Me } from '../App';
import { Logo } from '../components/Brand';
import DashHome from '../components/DashHome';
import ClockCard from '../components/ClockCard';
import EmployeesTab from '../components/EmployeesTab';
import LeavesTab from '../components/LeavesTab';
import SettingsTab from '../components/SettingsTab';
import BillingTab from '../components/BillingTab';
import PayrollPage from '../components/PayrollPage';
import OvertimeTab from '../components/OvertimeTab';
import CorrectionTab from '../components/CorrectionTab';
import LaporanPage from '../pages/LaporanPage';

type Tab = 'home' | 'clock' | 'history' | 'employees' | 'leaves' | 'overtime' | 'corrections' | 'payroll' | 'settings' | 'billing';

export default function Dashboard({ me, onLogout, refreshMe }: {
  me: Me; onLogout: () => void; refreshMe: () => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>('home');
  const qc = useQueryClient();
  const { data: sitesData } = useQuery({ queryKey: ['sites'], queryFn: () => api.sites() });
  const sites: Site[] = sitesData?.sites ?? [];
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('presensia_side_collapsed') === '1');
  const isAdmin = me.role !== 'employee';

  const toggleCollapse = (): void => {
    setCollapsed((c) => {
      localStorage.setItem('presensia_side_collapsed', c ? '0' : '1');
      return !c;
    });
  };

  const reloadSites = (): void => { void qc.invalidateQueries({ queryKey: ['sites'] }); };

  const nav: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
    { id: 'clock', label: 'Absensi', icon: <ScanFace size={17} /> },
    ...(isAdmin ? [{ id: 'employees' as Tab, label: me.role === 'manager' ? 'Tim Saya' : 'Karyawan', icon: <Users size={17} /> }] : []),
    { id: 'leaves', label: 'Cuti & Izin', icon: <Plane size={17} /> },
    { id: 'overtime', label: 'Lembur', icon: <Clock size={17} /> },
    { id: 'corrections', label: 'Koreksi Absensi', icon: <FileClock size={17} /> },
    { id: 'history', label: 'Laporan', icon: <FileBarChart2 size={17} /> },
    ...(isAdmin ? [
      { id: 'payroll' as Tab, label: 'Payroll', icon: <FileSpreadsheet size={17} /> },
      { id: 'settings' as Tab, label: 'Pengaturan', icon: <Settings size={17} /> },
      { id: 'billing' as Tab, label: 'Langganan', icon: <CreditCard size={17} /> },
    ] : []),
  ];

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className={`dash${collapsed ? ' collapsed' : ''}`}>
      <a href="#main-content" className="skip-link">Lewati ke konten utama</a>
      <aside className="side">
        <div className="side-brand">
          <Logo size={26} dark />
          <button type="button" className="side-collapse" title="Perkecil sidebar" onClick={toggleCollapse}>
            <ChevronsLeft size={15} />
          </button>
        </div>
        {collapsed && (
          <button type="button" className="side-collapse side-expand" title="Perbesar sidebar" onClick={toggleCollapse}>
            <ChevronsRight size={15} />
          </button>
        )}
        {nav.map((n) => (
          <button key={n.id} className={`side-item ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
            {n.icon}<span>{n.label}</span>
          </button>
        ))}
        <div className="side-footer">
          <span className="side-ava">{(me.name || me.email)[0].toUpperCase()}</span>
          <div>
            <b>{me.name}</b>
            <span>{me.role === 'owner' ? 'Owner' : me.role === 'admin' ? 'HR Admin' : me.role === 'manager' ? 'Manager' : 'Karyawan'}</span>
          </div>
          <button className="icon-btn side-exit" title="Keluar" aria-label="Keluar" onClick={() => { void onLogout(); }} style={{ color: '#8FA3B8' }}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="main" id="main-content">
        <header className="app-topbar">
          <div><span className="app-eyebrow">Presensia Workspace</span><h1>{nav.find((item) => item.id === tab)?.label ?? 'Dashboard'}</h1></div>
          <div className="app-topbar-actions"><span className="app-org">{me.org.name}</span><button className="icon-btn" type="button" title="Pengaturan" aria-label="Buka Pengaturan" onClick={() => setTab('settings')}><Settings size={18} /></button><span className="topbar-avatar">{(me.name || me.email)[0].toUpperCase()}</span></div>
        </header>
        {me.org.plan === 'trial' && me.org.planExpiresAt && (
          <div className="trial-banner">
            ⏳ Masa uji coba sampai {new Date(me.org.planExpiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            {sites.length === 0 && ' · belum ada lokasi absen — tambahkan di menu Pengaturan/Karyawan'}
          </div>
        )}

        {tab === 'home' && <DashHome me={me} sites={sites} goClock={() => setTab('clock')} today={today} onClocked={refreshMe} />}
        {tab === 'clock' && <ClockCard me={me} sites={sites} onClocked={refreshMe} />}
        {tab === 'employees' && <EmployeesTab sites={sites} onSitesChanged={reloadSites} />}
        {tab === 'leaves' && <LeavesTab me={me} />}
        {tab === 'overtime' && <OvertimeTab me={me} />}
        {tab === 'corrections' && <CorrectionTab me={me} />}
        {tab === 'history' && <LaporanPage me={me} />}
        {tab === 'payroll' && <PayrollPage />}
        {tab === 'settings' && <SettingsTab me={{ role: me.role, email: me.email }} />}
        {tab === 'billing' && <BillingTab me={me} />}
      </main>
    </div>
  );
}
