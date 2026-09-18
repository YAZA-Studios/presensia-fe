// ─────────────────────────────────────────────────────────────
// Hadirku FE — klien API (cookie session, kredensial ikut otomatis).
// ─────────────────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    credentials: 'include',
  });
  const body = await res.json().catch(() => ({})) as T & { error?: string };
  if (!res.ok) throw new ApiError(body.error || 'Terjadi kesalahan.', res.status);
  return body;
};

export const api = {
  register: (d: { orgName: string; name: string; email: string; password: string }) =>
    request<{ org: { name: string }; role: string }>('/register', { method: 'POST', body: JSON.stringify(d) }),
  login: (d: { email: string; password: string }) =>
    request<{ email: string; name: string; role: string; org: { name: string; plan: string; planExpiresAt: string | null } }>('/login', { method: 'POST', body: JSON.stringify(d) }),
  logout: () => request<{ ok: boolean }>('/logout', { method: 'POST' }),
  me: () => request<{ email: string; name: string; role: string; org: { name: string; plan: string; planExpiresAt: string | null } }>('/me'),

  sites: () => request<{ sites: Site[] }>('/sites'),
  createSite: (d: { name: string; lat: number; lng: number; radiusM: number; address?: string }) =>
    request<{ site: Site }>('/sites', { method: 'POST', body: JSON.stringify(d) }),
  deleteSite: (id: string) => request<{ ok: boolean }>(`/sites/${id}`, { method: 'DELETE' }),
  shifts: () => request<{ shifts: Shift[] }>('/shifts'),
  createShift: (d: { name: string; startTime: string; endTime: string; graceMinutes: number }) =>
    request<{ shift: Shift }>('/shifts', { method: 'POST', body: JSON.stringify(d) }),

  clock: (d: { lat: number; lng: number; selfie: string; kind: 'in' | 'out'; note?: string }) =>
    request<{ ok: boolean; status?: string; site: string; distM: number }>('/attendance/clock', { method: 'POST', body: JSON.stringify(d) }),
  today: () => request<{ workDate: string; attendance: { clockInAt: string | null; clockOutAt: string | null; status: string; note: string | null } | null }>('/attendance/today'),
  history: (month: string) => request<{ month: string; rows: HistoryRow[] }>(`/attendance?month=${month}`),

  employees: () => request<{ employees: Employee[] }>('/employees'),
  createEmployee: (d: { email: string; name: string; phone?: string; password: string; role?: string }) =>
    request<{ employee: Employee }>('/employees', { method: 'POST', body: JSON.stringify(d) }),
  deleteEmployee: (email: string) => request<{ ok: boolean }>(`/employees/${encodeURIComponent(email)}`, { method: 'DELETE' }),

  leaves: () => request<{ leaves: Leave[] }>('/leaves'),
  requestLeave: (d: { type: string; dateFrom: string; dateTo: string; reason?: string }) =>
    request<{ leave: Leave }>('/leaves', { method: 'POST', body: JSON.stringify(d) }),
  reviewLeave: (id: string, approve: boolean) =>
    request<{ ok: boolean }>(`/leaves/${id}/review`, { method: 'POST', body: JSON.stringify({ approve }) }),

  plans: () => request<{ plans: Plan[] }>('/plans'),
  billing: () => request<{ invoices: Invoice[] }>('/billing'),
  createInvoice: (d: { planId: string; method: 'transfer' | 'doku' }) =>
    request<{ invoice: Invoice; paymentUrl?: string; dokuError?: string }>('/billing/invoices', { method: 'POST', body: JSON.stringify(d) }),
  invoiceStatus: (id: string) => request<{ invoice: Invoice }>(`/billing/invoices/${id}`),
  uploadProof: (id: string, d: { dataUrl: string; note?: string }) =>
    request<{ ok: boolean }>(`/billing/invoices/${id}/proof`, { method: 'POST', body: JSON.stringify(d) }),
};

export interface Site { id: string; name: string; lat: number; lng: number; radiusM: number; address: string | null }
export interface Shift { id: string; name: string; startTime: string; endTime: string; graceMinutes: number }
export interface Employee { email: string; name: string; role: string; phone: string | null; totalHadir?: number }
export interface Leave { id: string; email?: string; name?: string; type: string; dateFrom: string; dateTo: string; reason: string | null; status: string }
export interface Plan { id: string; name: string; price: number; employeeQuota: number; months: number }
export interface Invoice { id: string; plan?: string; amount: number; status: string; method?: string | null; employeeQuota?: number; months?: number; paidAt?: string | null }
export interface HistoryRow { work_date: string; clock_in_at: string | null; clock_out_at: string | null; status: string; note: string | null; name?: string }
