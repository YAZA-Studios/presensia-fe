// ─────────────────────────────────────────────────────────────
// Presensia FE — klien API.
// Sesi lintas-domain (pages.dev → workers.dev) memakai Bearer token di
// localStorage: cookie SameSite=Lax tidak ikut request lintas-situs.
// Cookie tetap dikirim (credentials include) untuk pemakaian same-site.
// ─────────────────────────────────────────────────────────────
import { SESSION_ENDED_EVENT } from './lib/privateCache';

const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'presensia_token';

export const setToken = (token: string | null): void => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
  }
};

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

/** Fetch mentah dengan header auth (untuk unduh file, bukan JSON). */
const requestRaw = async (url: string): Promise<Response> => {
  const token = getToken();
  return fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' });
};
const base = (): string => BASE;

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
    credentials: 'include',
  });
  const body = await res.json().catch(() => ({})) as T & { error?: string };
  if (res.status === 401) setToken(null); // sesi kedaluwarsa → buang token
  if (!res.ok) throw new ApiError(body.error || 'Terjadi kesalahan.', res.status);
  return body;
};

export const api = {
  register: async (d: { orgName: string; name: string; email: string; password: string }) => {
    const r = await request<{ org: { name: string }; role: string; token: string; verificationRequired?: boolean }>('/register', { method: 'POST', body: JSON.stringify(d) });
    if (r.token) setToken(r.token);
    return r;
  },
  login: async (d: { email: string; password: string }) => {
    const r = await request<{ email: string; name: string; role: string; token: string; org: { name: string; plan: string; planExpiresAt: string | null } }>('/login', { method: 'POST', body: JSON.stringify(d) });
    if (r.token) setToken(r.token);
    return r;
  },
  exchange: async (code: string) => {
    const r = await request<{ token: string; email: string; name: string; role: string; org: { name: string; plan: string; planExpiresAt: string | null } }>('/auth/exchange', { method: 'POST', body: JSON.stringify({ code }) });
    if (r.token) setToken(r.token);
    return r;
  },
  logout: async () => {
    const r = await request<{ ok: boolean }>('/logout', { method: 'POST' });
    setToken(null);
    return r;
  },
  me: () => request<{ email: string; name: string; role: string; org: { name: string; plan: string; planExpiresAt: string | null } }>('/me'),

  // ── Alur akun via email (Brevo): aktivasi & kata sandi ──
  verifyEmail: (token: string) =>
    request<{ ok: boolean; alreadyVerified?: boolean }>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
  resendVerification: (email: string) =>
    request<{ ok: boolean }>('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),
  forgotPassword: (email: string) =>
    request<{ ok: boolean }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, newPassword: string) =>
    request<{ ok: boolean }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),

  sites: () => request<{ sites: Site[] }>('/sites'),
  createSite: (d: { name: string; lat: number; lng: number; radiusM: number; address?: string }) =>
    request<{ site: Site }>('/sites', { method: 'POST', body: JSON.stringify(d) }),
  deleteSite: (id: string) => request<{ ok: boolean }>(`/sites/${id}`, { method: 'DELETE' }),
  shifts: () => request<{ shifts: Shift[] }>('/shifts'),
  createShift: (d: { name: string; startTime: string; endTime: string; graceMinutes: number }) =>
    request<{ shift: Shift }>('/shifts', { method: 'POST', body: JSON.stringify(d) }),

  clock: (d: { lat: number; lng: number; accuracy?: number; selfie: string; kind: 'in' | 'out'; nonce?: string; note?: string }) =>
    request<{ ok: boolean; status?: string; site: string; distM: number }>('/attendance/clock', { method: 'POST', body: JSON.stringify(d) }),
  challenge: () =>
    request<{ nonce: string; code: string; expiresInSeconds: number }>('/attendance/challenge', { method: 'POST' }),
  policy: () => request<{ policy: OrgPolicy }>('/policy'),
  updatePolicy: (p: Partial<OrgPolicy>) => request<{ policy: OrgPolicy }>('/policy', { method: 'PUT', body: JSON.stringify(p) }),
  bpjsConfig: () => request<{ config: BpjsConfig; defaults: BpjsConfig; jkkClasses: JkkRiskClass[] }>('/bpjs-config'),
  updateBpjsConfig: (patch: Partial<BpjsConfig>) =>
    request<{ config: BpjsConfig; changed: boolean }>('/bpjs-config', { method: 'PUT', body: JSON.stringify(patch) }),
  delegations: () => request<{ delegations: Delegation[] }>('/delegations'),
  createDelegation: (d: { fromEmail: string; toEmail: string; dateFrom: string; dateTo: string }) =>
    request<{ delegation: Delegation }>('/delegations', { method: 'POST', body: JSON.stringify(d) }),
  corrections: (attId: string) => request<{ corrections: Correction[] }>(`/attendance/${attId}/corrections`),
  correctAttendance: (attId: string, d: { clockIn?: string; clockOut?: string; reason: string }) =>
    request<{ ok: boolean }>(`/attendance/${attId}/corrections`, { method: 'POST', body: JSON.stringify(d) }),
  today: () => request<{ workDate: string; attendance: { clockInAt: string | null; clockOutAt: string | null; status: string; note: string | null } | null }>('/attendance/today'),
  history: (month: string) => request<{ month: string; rows: HistoryRow[] }>(`/attendance?month=${month}`),

  employees: () => request<{ employees: Employee[] }>('/employees'),
  createEmployee: (d: { email: string; name: string; phone?: string; password: string; role?: string; reportsTo?: string; baseSalary?: number; contractEndDate?: string; hireDate?: string; npwp?: string }) =>
    request<{ employee: Employee }>('/employees', { method: 'POST', body: JSON.stringify(d) }),
  deleteEmployee: (email: string) => request<{ ok: boolean }>(`/employees/${encodeURIComponent(email)}`, { method: 'DELETE' }),
  assignShift: (d: { email: string; shiftId: string | null }) =>
    request<{ ok: boolean }>('/employees/shift', { method: 'POST', body: JSON.stringify(d) }),

  leaves: () => request<{ leaves: Leave[] }>('/leaves'),
  requestLeave: (d: { type: string; dateFrom: string; dateTo: string; reason?: string }) =>
    request<{ leave: Leave }>('/leaves', { method: 'POST', body: JSON.stringify(d) }),
  reviewLeave: (id: string, approve: boolean) =>
    request<{ ok: boolean }>(`/leaves/${id}/review`, { method: 'POST', body: JSON.stringify({ approve }) }),
  leaveBalances: () => request<{ year: number; quota: number; balances: LeaveBalance[] }>('/leaves/balance'),

  holidays: (year: string) => request<{ holidays: Holiday[] }>(`/holidays?year=${year}`),
  saveHoliday: (d: { date: string; name?: string; remove?: boolean }) =>
    request<{ ok: boolean }>('/holidays', { method: 'PUT', body: JSON.stringify(d) }),

  overtime: () => request<{ overtime: Overtime[] }>('/overtime'),
  requestOvertime: (d: { workDate: string; minutes: number; reason?: string }) =>
    request<{ ok: boolean; id: string }>('/overtime', { method: 'POST', body: JSON.stringify(d) }),
  reviewOvertime: (id: string, approve: boolean) =>
    request<{ ok: boolean; status: string }>(`/overtime/${id}/review`, { method: 'POST', body: JSON.stringify({ approve }) }),

  attendanceRequests: () => request<{ requests: AttendanceRequest[] }>('/attendance-requests'),
  requestCorrection: (d: { workDate: string; clockInAt?: string; clockOutAt?: string; reason: string }) =>
    request<{ ok: boolean; id: string }>('/attendance-requests', { method: 'POST', body: JSON.stringify(d) }),
  reviewCorrection: (id: string, approve: boolean, note?: string) =>
    request<{ ok: boolean; status: string }>(`/attendance-requests/${id}/review`, { method: 'POST', body: JSON.stringify({ approve, note }) }),

  attendanceLock: (month: string) => request<{ month: string; locked: boolean }>(`/attendance-lock?month=${month}`),
  setAttendanceLock: (month: string, lock: boolean) =>
    request<{ ok: boolean; locked: boolean }>('/attendance-lock', { method: 'POST', body: JSON.stringify({ month, lock }) }),

  payrollRuns: () => request<{ runs: PayrollRun[] }>('/payroll/runs'),
  createPayrollRun: (month: string) =>
    request<{ ok: boolean; runId: string; month: string; payslips: number; workingDays: number; yearEnd?: { employees: number; incomplete: string[]; totalDue: number } | null }>('/payroll/runs', { method: 'POST', body: JSON.stringify({ month }) }),
  finalizePayrollRun: (id: string) =>
    request<{ ok: boolean; status: string }>(`/payroll/runs/${id}/finalize`, { method: 'POST' }),
  payslips: (month: string) => request<{ payslips: Payslip[] }>(`/payroll/payslips?month=${month}`),
  setBaseSalary: (email: string, baseSalary: number, ptkp?: string, contractEndDate?: string, hireDate?: string, npwp?: string) =>
    request<{ ok: boolean }>('/employees/salary', { method: 'POST', body: JSON.stringify({ email, baseSalary, ptkp, contractEndDate, hireDate, npwp }) }),
  exportPayslips: (month: string): void => {
    const b = import.meta.env.VITE_API_URL || '/api';
    window.open(`${b}/payroll/payslips/export?month=${month}`, '_blank');
  },

  // ── THR tahunan (BR-13): run → prorata masa kerja → final → CSV ──
  thrRuns: () => request<{ runs: ThrRun[] }>('/thr/runs'),
  createThrRun: (year: number) =>
    request<{ ok: boolean; runId: string; year: number; refDate: string; count: number; total: number; ineligible: string[] }>('/thr/runs', { method: 'POST', body: JSON.stringify({ year }) }),
  thrRun: (id: string) => request<{ run: ThrRun; awards: ThrAward[] }>(`/thr/runs/${id}`),
  finalizeThrRun: (id: string) =>
    request<{ ok: boolean; status: string }>(`/thr/runs/${id}/finalize`, { method: 'POST' }),
  exportThrCsv: (year: number): void => {
    const b = import.meta.env.VITE_API_URL || '/api';
    window.open(`${b}/thr/runs/export?year=${year}`, '_blank');
  },
  // Rekap laporan bulanan dari payslips: SPT Masa PPh 21 & iuran BPJS.
  exportRecapSpt: (month: string): void => {
    const b = import.meta.env.VITE_API_URL || '/api';
    window.open(`${b}/payroll/recap/export?month=${month}&type=spt`, '_blank');
  },
  exportRecapBpjs: (month: string): void => {
    const b = import.meta.env.VITE_API_URL || '/api';
    window.open(`${b}/payroll/recap/export?month=${month}&type=bpjs`, '_blank');
  },
  // Rekap tahunan PPh 21 per karyawan (dasar bukti potong 1721-A1).
  exportRecapAnnual: (year: number): void => {
    const b = import.meta.env.VITE_API_URL || '/api';
    window.open(`${b}/payroll/recap/annual?year=${year}`, '_blank');
  },
  // PDF bukti potong 1721-A1 setahun (worker-generated via pdf-lib).
  exportRecapAnnualPdf: (year: number): void => {
    const b = import.meta.env.VITE_API_URL || '/api';
    window.open(`${b}/payroll/recap/annual/pdf?year=${year}`, '_blank');
  },
  // PDF bukti potong PER karyawan (QR + segel digital, siap dikirim).
  exportAnnualPdfFor: (year: number, email: string): void => {
    const b = import.meta.env.VITE_API_URL || '/api';
    window.open(`${b}/payroll/recap/annual/pdf?year=${year}&email=${encodeURIComponent(email)}`, '_blank');
  },
  // Daftar karyawan berslip setahun (untuk unduhan PDF per orang).
  annualEmployees: (year: number) =>
    request<{ year: number; employees: { email: string; name: string; months: number; bruto: number; total: number }[] }>(`/payroll/recap/annual/employees?year=${year}`),
  // Preview validasi snapshot iuran BPJS slip vs config aktif (JSON).
  bpjsCheck: (month: string) =>
    request<{ month: string; checked: number; bedaCount: number; tanpaSnapshot: number; rows: BpjsDiffRow[] }>(`/payroll/recap/bpjs-check?month=${month}`),

  summary: () => request<Summary>('/analytics/summary'),
  live: () => request<{ activities: LiveActivity[] }>('/analytics/live'),
  exportCsv: (month: string): void => {
    const base = import.meta.env.VITE_API_URL || '/api';
    window.open(`${base}/analytics/export?month=${month}`, '_blank');
  },
  exportTimesheet: (month: string): void => {
    const base = import.meta.env.VITE_API_URL || '/api';
    window.open(`${base}/timesheet/export?month=${month}`, '_blank');
  },

  // Template import karyawan — unduh sebagai blob (file Excel).
  importTemplate: async (): Promise<void> => {
    const res = await requestRaw(`${base()}/employees/import/template`);
    if (!res.ok) throw new ApiError('Gagal mengunduh template.', res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-import-karyawan-presensia.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  },
  importEmployees: (csv: string) =>
    request<{ summary: { created: number; skipped: number; failed: number }; results: { email: string; status: 'created' | 'skipped' | 'error'; message: string }[] }>(
      '/employees/import', { method: 'POST', body: JSON.stringify({ csv }) },
    ),

  plans: () => request<{ plans: Plan[] }>('/plans'),
  billing: () => request<{ invoices: Invoice[] }>('/billing'),
  createInvoice: (d: { planId: string; method?: 'doku'; bankId?: string }) =>
    request<{ invoice: Invoice; paymentUrl?: string; dokuError?: string; payment?: { virtualAccountNo: string | null; bankLabel: string; expiredAt: string; howToPayPage?: string } }>('/billing/invoices', { method: 'POST', body: JSON.stringify(d) }),
  // Kanal bank VA aktif di gateway yaza-payments (pilihan saat bayar).
  paymentMethods: () => request<{ channels: { id: string; label: string }[] }>('/payroll/payment-methods'),
  invoiceStatus: (id: string) => request<{ invoice: Invoice }>(`/billing/invoices/${id}`),
  // Read-only: status gateway DOKU (rahasia operator, diatur via CLI di server).
  dokuStatus: () => request<{ configured: boolean; env: 'sandbox' | 'production'; clientIdMasked: string | null }>('/admin/doku'),
};

export interface Site { id: string; name: string; lat: number; lng: number; radiusM: number; address: string | null }
export interface Shift { id: string; name: string; startTime: string; endTime: string; graceMinutes: number }
export interface Employee { email: string; name: string; role: string; phone: string | null; reportsTo?: string | null; shiftId?: string | null; shiftName?: string | null; totalHadir?: number; baseSalary?: number; ptkp?: string; contractEndDate?: string | null; hireDate?: string | null; npwp?: string | null }
export const PTKP_OPTIONS = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'] as const;
export interface Leave { id: string; email?: string; name?: string; type: string; dateFrom: string; dateTo: string; reason: string | null; status: string; reviewNote?: string | null }
export interface Plan { id: string; name: string; price: number; employeeQuota: number; months: number }
export interface Invoice { id: string; plan?: string; amount: number; status: string; method?: string | null; employeeQuota?: number; months?: number; paidAt?: string | null; vaNumber?: string | null; bankLabel?: string | null; howToPayUrl?: string | null; expiresAt?: string | null }
export interface HistoryRow { work_date: string; clock_in_at: string | null; clock_out_at: string | null; status: string; note: string | null; name?: string }
export interface OrgPolicy {
  timezone: string;
  breakMinutes: number;
  overtime: { minMinutes: number; roundMinutes: number; multiplierWeekday: number; multiplierHoliday: number };
  leave: { hrApprovalOverDays: number };
  gps: { maxAccuracyM: number; strictIpCheck: boolean };
}
export interface Delegation { id: string; fromEmail: string; toEmail: string; dateFrom: string; dateTo: string }
export interface BpjsConfig {
  jhtCompany: number; jhtEmployee: number; jkkCompany: number; jkmCompany: number;
  jpCompany: number; jpEmployee: number; jpWageCap: number;
  jkpCompany: number; jkpEmployee: number;
  kesehatanCompany: number; kesehatanEmployee: number; kesehatanWageCap: number;
}
export interface JkkRiskClass { id: string; label: string; rate: number }
/** Persen untuk tampilan (fraksi 0,037 → 3.7). */
export const pct = (fraction: number): number => Math.round(fraction * 10000) / 100;
export interface Correction { id: string; attendanceId: string; field: string; oldValue: string | null; newValue: string | null; reason: string; byEmail: string; at: string }
export interface Summary {
  date: string;
  headcount: number;
  today: { present: number; late: number; absent: number; leave: number };
  trend: { work_date: string; present: number; late: number; absent: number }[];
  lateLeaders: { name: string; late_count: number }[];
  bradford?: { email: string; name: string; spells: number; days: number; score: number }[];
}
export interface LiveActivity { name: string; date: string; clockInAt: string | null; clockOutAt: string | null; status: string }
export interface Holiday { date: string; name: string }
export interface LeaveBalance { email: string; name: string; quota: number; used: number; remaining: number }
export interface Overtime { id: string; email: string; name?: string; workDate: string; minutes: number; reason: string | null; status: string; reviewedBy: string | null; createdAt: string }
export interface AttendanceRequest { id: string; email: string; name?: string; workDate: string; clockInAt: string | null; clockOutAt: string | null; reason: string; status: string; reviewedBy: string | null; reviewNote: string | null; createdAt: string }
export interface PayrollRun { id: string; month: string; status: string; created_by?: string; finalized_by?: string | null; finalized_at?: string | null; created_at: string; payslip_count?: number; total_net?: number }
export interface ThrRun { id: string; year: number; ref_date: string; status: string; total?: number; created_by?: string; finalized_by?: string | null; finalized_at?: string | null; created_at: string; award_count?: number; eligible_count?: number; config?: string | null }
export interface ThrAward { email: string; name: string | null; hireDate: string | null; monthsWorked: number; prorataFactor: number; eligible: boolean; amount: number; reason: string | null }
export interface Payslip { id: string; run_id: string; email: string; name?: string; month: string; base_salary: number; present_days: number; late_minutes: number; overtime_minutes: number; overtime_pay: number; absence_deduction: number; net_pay: number; gross_monthly?: number; pph21?: number; pph21_rate?: number; bpjs_employee?: number; bpjs_company?: number; ptkp?: string; detail?: string }
/** Baris selisih BPJS: snapshot slip vs config aktif (BEDA / TANPA SNAPSHOT). */
export interface BpjsDiffRow { email: string; name: string; status: string; catatan: string }
export const rp = (n: number): string => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n ?? 0);
