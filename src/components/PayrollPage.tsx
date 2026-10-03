import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, FileSpreadsheet, Download, Wallet, Lock, Unlock, PlayCircle, CheckCircle2, Banknote, Gift, ShieldCheck, AlertTriangle } from 'lucide-react';
import { api, rp, type Payslip, type ThrAward } from '../api';

/** Kartu THR tahunan (BR-13): hitung draft prorata masa kerja → final → CSV.
 *  Masa kerja ≥ 12 bulan = 1 bulan gaji; < 12 bulan = proporsional. */
function ThrCard() {
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear - 1, thisYear - 2];

  const { data: runsData } = useQuery({ queryKey: ['thr-runs'], queryFn: () => api.thrRuns() });
  const run = (runsData?.runs ?? []).find((r) => Number(r.year) === year);
  const finalized = run?.status === 'finalized';

  const { data: detailData } = useQuery({
    queryKey: ['thr-run', run?.id],
    queryFn: () => api.thrRun(run!.id),
    enabled: !!run,
  });
  const awards: ThrAward[] = detailData?.awards ?? [];
  const total = detailData?.run?.total ?? run?.total ?? 0;
  const ineligible = awards.filter((a) => !a.eligible);

  const act = async (fn: () => Promise<string | void>): Promise<void> => {
    setBusy(true); setMsg('');
    try { const m = await fn(); if (m) setMsg(m); void qc.invalidateQueries(); }
    catch (err) { setMsg(err instanceof Error ? err.message : 'Gagal.'); } finally { setBusy(false); }
  };

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="form-toggle-row">
        <h3><Gift size={16} style={{ verticalAlign: '-3px' }} /> THR {year}</h3>
        <select className="month-input" value={year} onChange={(e) => { setYear(Number(e.target.value)); setMsg(''); }}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <p className="muted small" style={{ marginTop: 8 }}>
        BR-13: masa kerja ≥ 12 bulan = 1 bulan gaji; di bawah 12 bulan = proporsional (masa ÷ 12).
        Tanggal masuk kerja diatur di tab Karyawan.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        <button className="btn btn-sm btn-primary" disabled={busy || finalized}
          onClick={() => { void act(async () => {
            const r = await api.createThrRun(year);
            return `THR ${r.year} dihitung: ${r.count} karyawan, total ${rp(r.total)}${r.ineligible.length ? ` · ${r.ineligible.length} tidak berhak (isi tanggal masuk/gaji di tab Karyawan)` : ''}.`;
          }); }}>
          <PlayCircle size={14} /> {finalized ? 'Sudah Final' : 'Hitung Draft'}
        </button>
        <button className="btn btn-sm" disabled={busy || !run || finalized}
          onClick={() => { if (run) void act(async () => { await api.finalizeThrRun(run.id); return 'THR difinalisasi & dikunci.'; }); }}>
          <CheckCircle2 size={14} /> {finalized ? `Final oleh ${run?.finalized_by ?? '—'}` : 'Setujui Final'}
        </button>
        <button className="btn btn-sm btn-ghost" disabled={!run}
          onClick={() => api.exportThrCsv(year)}>
          <Download size={14} /> Unduh CSV
        </button>
      </div>
      {msg && <p className="muted small" style={{ marginTop: 8 }}>{msg}</p>}
      {awards.length > 0 && (
        <>
          <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="table">
            <thead><tr><th>Nama</th><th>Masuk Kerja</th><th className="num">Masa Kerja</th><th className="num">Prorata</th><th className="num">THR</th></tr></thead>
            <tbody>
              {awards.map((a) => (
                <tr key={a.email} style={!a.eligible ? { opacity: 0.55 } : undefined} title={a.reason ?? undefined}>
                  <td>{a.name ?? a.email}</td>
                  <td className="muted small">{a.hireDate ?? '— belum diisi'}</td>
                  <td className="num">{a.eligible ? (a.monthsWorked >= 12 ? `${a.monthsWorked} bln (penuh)` : `${a.monthsWorked} bln`) : '—'}</td>
                  <td className="num">{a.eligible ? `${Math.round(a.prorataFactor * 100)}%` : '—'}</td>
                  <td className="num"><b>{a.eligible ? rp(a.amount) : '—'}</b></td>
                </tr>
              ))}              </tbody>
          </table>
          </div>
          <p className="muted small" style={{ marginTop: 8 }}>
            Total THR berhak: <b>{rp(total)}</b> · {awards.length - ineligible.length} berhak
            {ineligible.length > 0 ? ` · ${ineligible.length} tidak berhak (arahkan kursor untuk alasan)` : ''}.
          </p>
        </>
      )}
      {!run && (
        <p className="muted small" style={{ marginTop: 8 }}>
          Belum ada run THR {year} — klik “Hitung Draft”. Karyawan tanpa tanggal masuk/gaji pokok
          dilaporkan tanpa jumlah (tidak dihitung) sampai datanya lengkap.
        </p>
      )}
    </div>
  );
}

export default function PayrollPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: histData } = useQuery({ queryKey: ['history', month], queryFn: () => api.history(month) });
  const rows = histData?.rows ?? [];

  const { data: lockData } = useQuery({ queryKey: ['att-lock', month], queryFn: () => api.attendanceLock(month) });
  const locked = lockData?.locked ?? false;

  const { data: runsData } = useQuery({ queryKey: ['payroll-runs'], queryFn: () => api.payrollRuns() });
  const runs = runsData?.runs ?? [];
  const run = runs.find((r) => r.month === month);
  const finalized = run?.status === 'finalized';

  const { data: slipData } = useQuery({
    queryKey: ['payslips', month],
    queryFn: () => api.payslips(month),
    enabled: !!run,
  });
  const slips: Payslip[] = slipData?.payslips ?? [];
  const totalNet = slips.reduce((a, s) => a + (s.net_pay || 0), 0);

  // Validasi snapshot iuran BPJS slip vs config aktif (preview visual).
  const { data: bpjsDiff } = useQuery({
    queryKey: ['bpjs-check', month],
    queryFn: () => api.bpjsCheck(month),
    enabled: !!run && slips.length > 0,
  });

  const act = async (fn: () => Promise<unknown>, ok: string): Promise<void> => {
    setBusy(true); setMsg('');
    try { await fn(); setMsg(ok); void qc.invalidateQueries(); }
    catch (err) { setMsg(err instanceof Error ? err.message : 'Gagal.'); } finally { setBusy(false); }
  };

  const present = rows.filter((r) => r.status === 'present' || r.status === 'late').length;
  const late = rows.filter((r) => r.status === 'late').length;
  const onLeave = rows.filter((r) => r.status === 'leave' || r.status === 'sick').length;
  const absent = rows.filter((r) => r.status === 'absent').length;
  const label = new Date(`${month}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <>
      <div className="main-head">
        <div>
          <h1><Wallet size={20} style={{ verticalAlign: '-4px' }} /> Payroll — {label}</h1>
          <p className="muted">Kunci absensi → hitung draft → setujui → slip gaji.</p>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="month-input" />
      </div>

      <div className="pay-grid">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3>Langkah Payroll {label}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 190 }}>
                  {locked ? <Lock size={15} color="seagreen" /> : <Unlock size={15} color="crimson" />}
                  <b>1. Kunci absensi</b>
                </span>
                <button className="btn btn-sm" disabled={busy || finalized}
                  onClick={() => { void act(() => api.setAttendanceLock(month, !locked), locked ? 'Periode dibuka (tercatat di audit).' : 'Periode dikunci.'); }}>
                  {locked ? 'Buka Kunci' : 'Kunci Periode'}
                </button>
                {locked && <span className="badge leave-approved">Terkunci</span>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 190 }}>
                  <PlayCircle size={15} />
                  <b>2. Hitung payroll</b>
                </span>
                <button className="btn btn-sm btn-primary" disabled={busy || !locked || finalized}
                  onClick={() => { void act(async () => {
                    const r = await api.createPayrollRun(month);
                    if (r.yearEnd && r.yearEnd.employees > 0) {
                      const warn = r.yearEnd.incomplete.length > 0
                        ? ` (${r.yearEnd.incomplete.length} karyawan riwayat Jan–Nov < 11 bulan — cek sebelum final)` : '';
                      setMsg(`Payroll Desember dihitung ulang dengan tarif Pasal 17 (setahun − Jan–Nov): jatuh tempo ${rp(r.yearEnd.totalDue)}${warn}.`);
                    } else {
                      setMsg('Draft payroll dihitung.');
                    }
                  }, 'Draft payroll dihitung.'); }}>
                  {month.endsWith('-12') ? 'Hitung Draft (Pasal 17)' : 'Hitung Draft'}
                </button>
                {!locked && <span className="muted small">kunci dulu absensinya</span>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 190 }}>
                  <CheckCircle2 size={15} />
                  <b>3. Finalisasi</b>
                </span>
                <button className="btn btn-sm" disabled={busy || !run || finalized}
                  onClick={() => { if (run) void act(() => api.finalizePayrollRun(run.id), 'Payroll difinalisasi & dikunci.'); }}>
                  {finalized ? `Final oleh ${run?.finalized_by ?? '—'}` : 'Setujui Final'}
                </button>
              </div>
            </div>
            {msg && <p className="muted small" style={{ marginTop: 10 }}>{msg}</p>}
            {month.endsWith('-12') && (
              <p className="muted small" style={{ marginTop: 6 }}>
                <b>Desember = Masa Pajak Terakhir:</b> PPh 21 dihitung tarif Pasal 17 progresif tahunan
                (bruto setahun − biaya jabatan − iuran pensiun − PTKP), lalu dikurangi PPh 21 Jan–Nov.
                Selisihnya (kurang/lebih potong) muncul di slip bulan ini. Riwayat payslip Jan–Nov
                di tahun sama dibutuhkan agar kredit akurat.
              </p>
            )}
            <p className="muted small" style={{ marginTop: 6 }}>
              Setelah final, angka tidak dapat diubah — koreksi lewat payroll bulan berikutnya (jejak audit).
              Gaji pokok diatur di tab Karyawan.
            </p>
          </div>

          <div className="pay-tile" style={{ marginBottom: 12 }}>
            <span className="pay-file-icon pfi-csv">CSV</span>
            <div style={{ flex: 1 }}>
              <b>Timesheet Payroll CSV</b>
              <span>Gross/break/net minutes, late, overtime — siap unggah ke software payroll.</span>
            </div>
            <button className="btn btn-primary" onClick={() => api.exportTimesheet(month)}><Download size={15} /> Unduh</button>
          </div>
          <div className="pay-tile" style={{ marginBottom: 12 }}>
            <span className="pay-file-icon pfi-xls"><FileSpreadsheet size={20} /></span>
            <div style={{ flex: 1 }}>
              <b>Rekap Absensi CSV</b>
              <span>Data mentah clock-in/out per karyawan untuk pengecekan manual.</span>
            </div>
            <button className="btn btn-ghost" onClick={() => api.exportCsv(month)}><FileText size={15} /> Unduh</button>
          </div>
          <div className="pay-tile" style={{ marginBottom: 12 }}>
            <span className="pay-file-icon pfi-csv"><Banknote size={20} /></span>
            <div style={{ flex: 1 }}>
              <b>Slip Gaji CSV {label}</b>
              <span>Gaji pokok, lembur, potongan, net — untuk bank/akuntansi.</span>
            </div>
            <button className="btn btn-ghost" disabled={slips.length === 0} onClick={() => api.exportPayslips(month)}><Download size={15} /> Unduh</button>
          </div>
          <div className="pay-tile" style={{ marginBottom: 12 }}>
            <span className="pay-file-icon pfi-csv"><FileText size={20} /></span>
            <div style={{ flex: 1 }}>
              <b>Rekap SPT Masa PPh 21 {label}</b>
              <span>Bruto, DPP, TER & PPh 21 per karyawan + TOTAL — isi form SPT Masa (1721).</span>
            </div>
            <button className="btn btn-ghost" disabled={slips.length === 0} onClick={() => api.exportRecapSpt(month)}><Download size={15} /> Unduh</button>
          </div>
          <div className="pay-tile" style={{ marginBottom: 12 }}>
            <span className="pay-file-icon pfi-csv"><Banknote size={20} /></span>
            <div style={{ flex: 1 }}>
              <b>Rekap Iuran BPJS (JAMSOSTEK) {label}</b>
              <span>JHT/JKK/JKM/JP/JKP/Kesehatan karyawan & perusahaan + TOTAL — laporan bulanan BPJS.</span>
            </div>
            <button className="btn btn-ghost" disabled={slips.length === 0} onClick={() => api.exportRecapBpjs(month)}><Download size={15} /> Unduh</button>
          </div>
          <div className="pay-tile">
            <span className="pay-file-icon pfi-csv"><FileText size={20} /></span>
            <div style={{ flex: 1 }}>
              <b>Rekap PPh 21 Tahunan (1721-A1) {month.slice(0, 4)}</b>
              <span>Bruto, pengurang iuran & PPh 21 Jan–Des per karyawan — dasar bukti potong 1721-A1.</span>
            </div>
            <button className="btn btn-ghost" onClick={() => api.exportRecapAnnual(Number(month.slice(0, 4)))}><Download size={15} /> Unduh</button>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3>Ringkasan Absensi {label}</h3>
            <div className="summary-kpis" style={{ marginTop: 12 }}>
              <div><b>{present}</b><span>Hadir</span></div>
              <div><b>{late}</b><span>Telat</span></div>
              <div><b>{onLeave}</b><span>Izin/Sakit</span></div>
              <div><b>{absent}</b><span>Absen</span></div>
            </div>
          </div>

          {bpjsDiff && bpjsDiff.checked > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3>
                {bpjsDiff.bedaCount + bpjsDiff.tanpaSnapshot === 0
                  ? <ShieldCheck size={16} style={{ verticalAlign: '-3px', color: 'seagreen' }} />
                  : <AlertTriangle size={16} style={{ verticalAlign: '-3px', color: '#B97D0E' }} />}
                {' '}Validasi BPJS vs Config Aktif
              </h3>
              {bpjsDiff.bedaCount + bpjsDiff.tanpaSnapshot === 0 ? (
                <p className="muted small" style={{ marginTop: 8 }}>
                  Semua iuran BPJS pada {bpjsDiff.checked} slip {label} sesuai konfigurasi aktif.
                </p>
              ) : (
                <>
                  <p className="small" style={{ marginTop: 8 }}>
                    <b style={{ color: '#B97D0E' }}>
                      {bpjsDiff.bedaCount > 0 && `${bpjsDiff.bedaCount} slip beda tarif`}
                      {bpjsDiff.bedaCount > 0 && bpjsDiff.tanpaSnapshot > 0 && ' · '}
                      {bpjsDiff.tanpaSnapshot > 0 && `${bpjsDiff.tanpaSnapshot} slip tanpa rincian`}
                    </b>{' '}
                    dibanding config BPJS yang berlaku sekarang:
                  </p>
                  <div className="table-wrap" style={{ marginTop: 8 }}>
                  <table className="table">
                    <thead><tr><th>Karyawan</th><th>Status</th><th>Selisih</th></tr></thead>
                    <tbody>
                      {bpjsDiff.rows.map((r) => (
                        <tr key={r.email}>
                          <td>{r.name}</td>
                          <td>
                            <span className={`badge ${r.status === 'BEDA' ? 'leave-pending' : ''}`}
                              style={r.status !== 'BEDA' ? { background: '#FDF3DF', color: '#B97D0E' } : undefined}>
                              {r.status}
                            </span>
                          </td>
                          <td className="muted small">{r.catatan}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  <p className="muted small" style={{ marginTop: 8 }}>
                    Snapshot slip tidak berubah setelah final. Atur tarif di Pengaturan → Konfigurasi BPJS,
                    lalu hitung ulang payroll bulan berjalan bila perlu.
                  </p>
                </>
              )}
            </div>
          )}

          <div className="card">
            <h3>Slip Gaji ({slips.length}) — Total Net {rp(totalNet)}</h3>
            {slips.length === 0 ? (
              <p className="muted small" style={{ marginTop: 8 }}>
                Belum ada slip. Kunci periode lalu hitung draft. Karyawan tanpa gaji pokok dilewati —
                atur di tab Karyawan.
              </p>
            ) : (
              <>
              <div className="table-wrap" style={{ marginTop: 10 }}>
              <table className="table">
                <thead><tr><th>Nama</th><th>PTKP</th><th className="num">Gaji Pokok</th><th className="num">Lembur</th><th className="num">Potongan Absen</th><th className="num">PPh 21</th><th className="num">BPJS Kry.</th><th className="num">Net</th></tr></thead>
                <tbody>
                  {slips.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name ?? s.email}</td>
                      <td className="muted small">{s.ptkp ?? 'TK/0'}</td>
                      <td className="num">{rp(s.base_salary)}</td>
                      <td className="num">{s.overtime_minutes > 0 ? `${s.overtime_minutes} mnt · ${rp(s.overtime_pay)}` : '—'}</td>
                      <td className="num">{s.absence_deduction > 0 ? `−${rp(s.absence_deduction)}` : '—'}</td>
                      <td className="num">{(s.pph21 ?? 0) > 0 ? `${rp(s.pph21!)} (${((s.pph21_rate ?? 0) * 100).toFixed(2)}%)` : '—'}</td>
                      <td className="num">{(s.bpjs_employee ?? 0) > 0 ? rp(s.bpjs_employee!) : '—'}</td>
                      <td className="num"><b>{rp(s.net_pay)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <p className="muted small" style={{ marginTop: 8 }}>
                PPh 21 = TER (PP 58/2023) × bruto (gaji − potongan hadir + lembur − JHT/JP karyawan).
                BPJS karyawan = JHT 2% + JP 1% + JKP 0,06% + Kesehatan 1% (JP & Kesehatan mengikuti plafon upah).
                Iuran perusahaan tersimpan pada rincian slip & CSV.
              </p>
              </>
            )}
          </div>

          <ThrCard />
        </div>
      </div>
    </>
  );
}
