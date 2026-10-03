import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { api, ApiError } from '../api';
import type { Me } from '../App';

const rupiah = (n: number): string => `Rp ${n.toLocaleString('id-ID')}`;

export default function BillingTab({ me }: { me: Me }) {
  const isOwner = me.role === 'owner';
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [waitingId, setWaitingId] = useState<string | null>(null);

  const { data: planData } = useQuery({ queryKey: ['plans'], queryFn: () => api.plans() });
  const { data: invData } = useQuery({ queryKey: ['billing'], queryFn: () => api.billing() });
  const { data: doku } = useQuery({
    queryKey: ['doku-status'],
    queryFn: () => api.dokuStatus(),
    enabled: isOwner,
    retry: false,
  });

  // Polling status invoice saat menunggu pembayaran DOKU — refetch tiap 4 dtk;
  // segera berhenti (refetchInterval 0) setelah invoice terbayar.
  const { data: waitingInv } = useQuery({
    queryKey: ['invoice', waitingId],
    queryFn: () => api.invoiceStatus(waitingId!),
    enabled: !!waitingId,
    refetchInterval: (query) => (query.state.data?.invoice.status === 'paid' ? false : 4000),
  });
  if (waitingId && waitingInv?.invoice.status === 'paid') {
    setWaitingId(null);
    void qc.invalidateQueries({ queryKey: ['billing'] });
  }

  const plans = planData?.plans ?? [];
  const invoices = invData?.invoices ?? [];

  const pay = async (planId: string): Promise<void> => {
    setBusyId(planId); setError('');
    try {
      const res = await api.createInvoice({ planId, method: 'doku' });
      void qc.invalidateQueries({ queryKey: ['billing'] });
      if (res.paymentUrl) {
        window.open(res.paymentUrl, '_blank');
        setWaitingId(res.invoice.id);
      } else if (res.dokuError) setError(res.dokuError);
      else setError('Gagal membuat tautan pembayaran.');
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Gagal membuat invoice.'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="two-col">
      <div>
        <div className="card" style={{ marginBottom: 18 }}>
          <h2>Upgrade Paket</h2>
          <p className="muted">Paket aktif: <strong className="capitalize">{me.org.plan}</strong>
            {me.org.planExpiresAt && ` · aktif sampai ${new Date(me.org.planExpiresAt).toLocaleDateString('id-ID')}`}</p>
          <div className="plan-mini-grid">
            {plans.map((p) => (
              <div key={p.id} className="plan-mini">
                <h3>{p.name}</h3>
                <div className="plan-price">{rupiah(p.price)}<small> /{p.months >= 12 ? 'tahun' : 'bulan'}</small></div>
                <p className="muted small">Hingga {p.employeeQuota} karyawan</p>
                <button className="btn btn-primary btn-sm" disabled={busyId === p.id} onClick={() => { void pay(p.id); }}>
                  Bayar via DOKU {busyId === p.id && '…'}
                </button>
              </div>
            ))}
          </div>
          {waitingId && <div className="ok-box"><ExternalLink size={14} /> Menunggu pembayaran DOKU — halaman ini otomatis ter-update setelah lunas.</div>}
          {error && <div className="error-box">{error}</div>}
        </div>

        {/* Owner hanya melihat STATUS gateway — tanpa form kredensial di dalam aplikasi. */}
        {isOwner && doku && (
          <div className={`status-chip ${doku.configured ? 'ok' : 'warn'}`}>
            {doku.configured
              ? <><CheckCircle2 size={15} /> Gateway DOKU aktif · {doku.env === 'production' ? 'Production' : 'Sandbox'} · {doku.clientIdMasked}</>
              : <><XCircle size={15} /> Gateway DOKU belum dikonfigurasi — diatur operator via server.</>}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Riwayat Invoice</h2>
        <table className="table">
          <thead><tr><th>ID</th><th>Paket</th><th>Nominal</th><th>Status</th><th>Metode</th></tr></thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id}>
                <td className="mono small">{i.id}</td>
                <td className="capitalize">{i.plan ?? '—'}</td>
                <td>{rupiah(i.amount)}</td>
                <td><span className={`badge inv-${i.status}`}>{i.status === 'paid' ? 'Lunas' : i.status === 'unpaid' ? 'Belum Bayar' : i.status}</span></td>
                <td className="muted">{i.method === 'doku' ? 'DOKU' : i.method || '—'}</td>
              </tr>
            ))}
            {invoices.length === 0 && <tr><td colSpan={5} className="muted">Belum ada invoice.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
