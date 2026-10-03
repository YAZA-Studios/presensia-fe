// ─────────────────────────────────────────────────────────────
// Presensia — Halaman Laporan: satu tempat untuk semua unduhan
// (timesheet, absensi, slip gaji, SPT Masa PPh 21, BPJS, rekap
// tahunan CSV & PDF 1721-A1, THR) + riwayat absensi di bawahnya.
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  FileBarChart2, FileSpreadsheet, FileText, Banknote,
  Download, FileDown, Gift,
} from 'lucide-react';
import { api } from '../api';
import type { Me } from '../App';
import HistoryTab from '../components/HistoryTab';

export default function LaporanPage({ me }: { me: Me }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const year = Number(month.slice(0, 4));
  const label = new Date(`${month}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const isAdmin = me.role !== 'employee';

  return (
    <>
      <div className="main-head">
        <div>
          <h1><FileBarChart2 size={20} style={{ verticalAlign: '-4px' }} /> Laporan — {label}</h1>
          <p className="muted">Semua unduhan laporan dalam satu tempat, diikuti riwayat absensi.</p>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="month-input" />
      </div>

      {isAdmin ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Unduhan & Laporan {label}</h3>
          <p className="muted small" style={{ marginTop: 4 }}>
            CSV terbuka di tab baru — siap dibuka di Excel/Google Sheets atau diunggah ke sistem terkait.
          </p>

          <div className="pay-tile" style={{ marginTop: 12, marginBottom: 12 }}>
            <span className="pay-file-icon pfi-csv">CSV</span>
            <div style={{ flex: 1 }}>
              <b>Timesheet Payroll</b>
              <span>Jam kotor/istirahat/bersih, menit telat & lembur — siap unggah ke software payroll.</span>
            </div>
            <button className="btn btn-primary" onClick={() => api.exportTimesheet(month)}><Download size={15} /> Unduh</button>
          </div>
          <div className="pay-tile" style={{ marginBottom: 12 }}>
            <span className="pay-file-icon pfi-xls"><FileSpreadsheet size={20} /></span>
            <div style={{ flex: 1 }}>
              <b>Rekap Absensi</b>
              <span>Data mentah clock-in/out per karyawan untuk pengecekan manual.</span>
            </div>
            <button className="btn btn-ghost" onClick={() => api.exportCsv(month)}><FileText size={15} /> Unduh</button>
          </div>
          <div className="pay-tile" style={{ marginBottom: 12 }}>
            <span className="pay-file-icon pfi-csv"><Banknote size={20} /></span>
            <div style={{ flex: 1 }}>
              <b>Slip Gaji {label}</b>
              <span>Gaji pokok, lembur, potongan, PPh 21, BPJS, net — untuk bank/akuntansi.</span>
            </div>
            <button className="btn btn-ghost" onClick={() => api.exportPayslips(month)}><Download size={15} /> Unduh</button>
          </div>
          <div className="pay-tile" style={{ marginBottom: 12 }}>
            <span className="pay-file-icon pfi-csv"><FileText size={20} /></span>
            <div style={{ flex: 1 }}>
              <b>Rekap SPT Masa PPh 21 (1721)</b>
              <span>NPWP, bruto, DPP, TER & PPh 21 per karyawan + TOTAL — isi form SPT Masa.</span>
            </div>
            <button className="btn btn-ghost" onClick={() => api.exportRecapSpt(month)}><Download size={15} /> Unduh</button>
          </div>
          <div className="pay-tile" style={{ marginBottom: 12 }}>
            <span className="pay-file-icon pfi-csv"><Banknote size={20} /></span>
            <div style={{ flex: 1 }}>
              <b>Rekap Iuran BPJS (JAMSOSTEK)</b>
              <span>JHT/JKK/JKM/JP/JKP/Kesehatan karyawan & perusahaan + validasi vs config aktif.</span>
            </div>
            <button className="btn btn-ghost" onClick={() => api.exportRecapBpjs(month)}><Download size={15} /> Unduh</button>
          </div>
          <div className="pay-tile" style={{ marginBottom: 12 }}>
            <span className="pay-file-icon pfi-csv"><FileText size={20} /></span>
            <div style={{ flex: 1 }}>
              <b>Rekap PPh 21 Tahunan (1721-A1) {year}</b>
              <span>Bruto, pengurang iuran & PPh 21 Jan–Des per karyawan — dasar bukti potong.</span>
            </div>
            <button className="btn btn-ghost" onClick={() => api.exportRecapAnnual(year)}><Download size={15} /> Unduh</button>
          </div>
          <div className="pay-tile" style={{ marginBottom: 12 }}>
            <span className="pay-file-icon pfi-pdf"><FileDown size={20} /></span>
            <div style={{ flex: 1 }}>
              <b>PDF Bukti Potong PPh 21 (1721-A1) {year}</b>
              <span>Bukti potong resmi per karyawan dari payslips setahun — siap cetak/tanda tangan.</span>
            </div>
            <button className="btn btn-secondary" onClick={() => api.exportRecapAnnualPdf(year)}><FileDown size={15} /> Unduh PDF</button>
          </div>
          <div className="pay-tile">
            <span className="pay-file-icon pfi-csv"><Gift size={20} /></span>
            <div style={{ flex: 1 }}>
              <b>THR {year}</b>
              <span>Rekap THR per karyawan: masa kerja, prorata (BR-13), jumlah & total.</span>
            </div>
            <button className="btn btn-ghost" onClick={() => api.exportThrCsv(year)}><Download size={15} /> Unduh</button>
          </div>
        </div>
      ) : (
        <p className="muted small" style={{ marginBottom: 16 }}>
          Unduhan laporan perusahaan tersedia untuk admin/owner. Slip gaji pribadi dapat diminta ke HR.
        </p>
      )}

      <HistoryTab me={me} />
    </>
  );
}
