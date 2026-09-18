import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { api, ApiError, type Plan, type Invoice } from '../api';
import type { Me } from '../App';

const rupiah = (n: number): string => `Rp ${n.toLocaleString('id-ID')}`;

export default function BillingTab({ me }: { me: Me }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [waitingId, setWaitingId] = useState<string | null>(null);
  const proofRef = useRef<HTMLInputElement>(null);
  const proofInvoiceId = useRef<string | null>(null);

  const load = (): void => { api.billing().then((r) => setInvoices(r.invoices)).catch(() => {}); };
  useEffect(() => {
    api.plans().then((r) => setPlans(r.plans)).catch(() => {});
    load();
  }, []);

  // Polling status invoice saat menunggu DOKU.
  useEffect(() => {
    if (!waitingId) return;
    const t = setInterval(() => {
      api.invoiceStatus(waitingId).then((r) => {
        if (r.invoice.status === 'paid') { setWaitingId(null); load(); }
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [waitingId]);

  const pay = async (planId: string, method: 'doku' | 'transfer'): Promise<void> => {
    setBusyId(planId + method); setError('');
    try {
      const res = await api.createInvoice({ planId, method });
      load();
      if (method === 'doku') {
        if (res.paymentUrl) {
          window.open(res.paymentUrl, '_blank');
          setWaitingId(res.invoice.id);
        } else if (res.dokuError) setError(res.dokuError);
      } else {
        proofInvoiceId.current = res.invoice.id;
        proofRef.current?.click();
      }
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Gagal membuat invoice.'); }
    finally { setBusyId(null); }
  };

  const pickProof = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    const id = proofInvoiceId.current;
    if (!file || !id) return;
    const dataUrl = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.readAsDataURL(file);
    });
    try { await api.uploadProof(id, { dataUrl, note: 'Bukti transfer' }); load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Gagal unggah bukti.'); }
  };

  return (
    <div className="two-col">
      <div className="card">
        <h2>Upgrade Paket</h2>
        <p className="muted">Paket aktif: <strong className="capitalize">{me.org.plan}</strong>
          {me.org.planExpiresAt && ` · aktif sampai ${new Date(me.org.planExpiresAt).toLocaleDateString('id-ID')}`}</p>
        <div className="plan-mini-grid">
          {plans.map((p) => (
            <div key={p.id} className="plan-mini">
              <h3>{p.name}</h3>
              <div className="plan-price">{rupiah(p.price)}<small> /{p.months >= 12 ? 'tahun' : 'bulan'}</small></div>
              <p className="muted small">Hingga {p.employeeQuota} karyawan</p>
              <button className="btn btn-primary btn-sm" disabled={busyId === p.id + 'doku'} onClick={() => { void pay(p.id, 'doku'); }}>
                Bayar via DOKU {busyId === p.id + 'doku' && '…'}
              </button>
              <button className="btn btn-ghost btn-sm" disabled={busyId === p.id + 'transfer'} onClick={() => { void pay(p.id, 'transfer'); }}>
                Transfer Manual
              </button>
            </div>
          ))}
        </div>
        {waitingId && <div className="ok-box"><ExternalLink size={14} /> Menunggu pembayaran DOKU — halaman ini otomatis ter-update setelah lunas.</div>}
        {error && <div className="error-box">{error}</div>}
        <input ref={proofRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => { void pickProof(e); }} />
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
                <td className="muted">{i.method === 'doku' ? 'DOKU' : i.method === 'transfer' ? 'Transfer' : '—'}</td>
              </tr>
            ))}
            {invoices.length === 0 && <tr><td colSpan={5} className="muted">Belum ada invoice.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
