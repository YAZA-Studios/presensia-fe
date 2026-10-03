import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Copy, ExternalLink, Landmark, XCircle } from 'lucide-react';
import { api, ApiError } from '../api';
import type { Me } from '../App';

const rupiah = (n: number): string => `Rp ${n.toLocaleString('id-ID')}`;

interface PaymentVaInfo { virtualAccountNo: string | null; bankLabel: string; expiredAt: string; howToPayPage?: string }

export default function BillingTab({ me }: { me: Me }) {
  const isOwner = me.role === 'owner';
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [waitingId, setWaitingId] = useState<string | null>(null);
  const [vaInfo, setVaInfo] = useState<PaymentVaInfo | null>(null);
  const [copied, setCopied] = useState(false);
  // Pilihan bank VA: kartu paket → pilih bank → lanjut bayar.
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [bankId, setBankId] = useState('');

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

  // Kanal bank VA aktif (untuk pilihan saat bayar).
  const { data: pmData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => api.paymentMethods(),
    enabled: me.role !== 'employee',
  });
  const channels = pmData?.channels ?? [];

  const plans = planData?.plans ?? [];
  const invoices = invData?.invoices ?? [];

  const openBankChoice = (planId: string): void => {
    setSelectedPlan(planId);
    setBankId(channels[0]?.id ?? '');
    setVaInfo(null);
    setError('');
  };

  const pay = async (planId: string, chosenBank?: string): Promise<void> => {
    setBusyId(planId); setError(''); setVaInfo(null); setCopied(false);
    try {
      const res = await api.createInvoice({ planId, method: 'doku', bankId: chosenBank || undefined });
      void qc.invalidateQueries({ queryKey: ['billing'] });
      if (res.payment) {
        setVaInfo(res.payment);
        if (res.payment.howToPayPage) window.open(res.payment.howToPayPage, '_blank');
        setWaitingId(res.invoice.id);
      } else if (res.paymentUrl) {
        window.open(res.paymentUrl, '_blank');
        setWaitingId(res.invoice.id);
      } else if (res.dokuError) setError(res.dokuError);
      else setError('Gagal membuat pembayaran.');
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Gagal membuat invoice.'); }
    finally { setBusyId(null); }
  };

  const copyVa = async (): Promise<void> => {
    if (!vaInfo?.virtualAccountNo) return;
    try { await navigator.clipboard.writeText(vaInfo.virtualAccountNo); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* diabaikan */ }
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
                <button className="btn btn-primary btn-sm" disabled={busyId === p.id} onClick={() => openBankChoice(p.id)}>
                  Bayar via VA {busyId === p.id && '…'}
                </button>
              </div>
            ))}
          </div>

          {selectedPlan && (
            <div className="card" style={{ marginTop: 14, border: '1.5px solid var(--blue)' }} role="group" aria-label="Pilih bank Virtual Account">
              <h3 style={{ marginTop: 0 }}><Landmark size={16} style={{ verticalAlign: '-3px' }} /> Pilih Bank Virtual Account</h3>
              {channels.length === 0 ? (
                <p className="muted small">Tidak ada kanal VA aktif saat ini — hubungi admin.</p>
              ) : (
                <>
                  <label className="mini" style={{ maxWidth: 340 }}>
                    Bank tujuan transfer
                    <select value={bankId} onChange={(e) => setBankId(e.target.value)}>
                      {channels.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="btn btn-primary btn-sm" disabled={!!busyId || !bankId}
                      onClick={() => { const pid = selectedPlan; setSelectedPlan(null); if (pid) void pay(pid, bankId); }}>
                      Lanjut Bayar
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedPlan(null)}>Batal</button>
                  </div>
                </>
              )}
            </div>
          )}
          {vaInfo && (
            <div className="card" style={{ marginTop: 14, border: '1.5px solid var(--teal)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Landmark size={16} /> Virtual Account — {vaInfo.bankLabel}</h3>
              {vaInfo.virtualAccountNo ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0', flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 22, letterSpacing: 1, fontVariantNumeric: 'tabular-nums' }}>{vaInfo.virtualAccountNo}</b>
                    <button className="btn btn-sm btn-ghost" onClick={() => { void copyVa(); }}><Copy size={13} /> {copied ? 'Tersalin!' : 'Salin'}</button>
                  </div>
                  <p className="muted small">Berlaku sampai {new Date(vaInfo.expiredAt).toLocaleString('id-ID')} · transfer sesuai nominal tepat.</p>
                  {vaInfo.howToPayPage && (
                    <button className="btn btn-secondary btn-sm" onClick={() => window.open(vaInfo.howToPayPage!, '_blank')}>
                      <ExternalLink size={13} /> Buka Cara Pembayaran
                    </button>
                  )}
                </>
              ) : <p className="muted small">Virtual Account sedang dibuat — muat ulang beberapa saat lagi.</p>}
            </div>
          )}
          {waitingId && <div className="ok-box"><ExternalLink size={14} /> Menunggu pembayaran — halaman ini otomatis ter-update setelah lunas.</div>}
          {error && <div className="error-box">{error}</div>}
        </div>

        {/* Owner hanya melihat STATUS gateway — tanpa form kredensial di dalam aplikasi. */}
        {isOwner && doku && (
          <div className={`status-chip ${doku.configured ? 'ok' : 'warn'}`}>
            {doku.configured
              ? <><CheckCircle2 size={15} /> Gateway pembayaran aktif (Yaza Payments · DOKU VA) · {doku.clientIdMasked ?? 'siap'}</>
              : <><XCircle size={15} /> Gateway pembayaran belum aktif — pasang YAZA_PAYMENTS_API_KEY via server (operator).</>}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Riwayat Invoice</h2>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="table">
            <thead><tr><th>ID</th><th>Paket</th><th className="num">Nominal</th><th>Virtual Account</th><th>Status</th><th>{' '}</th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} style={{ opacity: i.status === 'expired' ? 0.65 : undefined }}>
                  <td className="mono small">{i.id}</td>
                  <td className="capitalize">{i.plan ?? '—'}</td>
                  <td className="num">{rupiah(i.amount)}</td>
                  <td className="mono small">{i.vaNumber ? `${i.bankLabel ?? ''} · ${i.vaNumber}` : '—'}</td>
                  <td>
                    <span className={`badge ${i.status === 'expired' ? 'leave-rejected' : `inv-${i.status}`}`}>
                      {i.status === 'paid' ? 'Lunas' : i.status === 'unpaid' ? 'Belum Bayar' : i.status === 'expired' ? 'Kedaluwarsa' : i.status}
                    </span>
                  </td>
                  <td>
                    {(i.status === 'unpaid' || i.status === 'expired') && i.plan && (
                      <button className="btn btn-sm btn-ghost" title="Buat Virtual Account baru untuk invoice ini"
                        onClick={() => openBankChoice(i.plan!)}>
                        Bayar Ulang
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={6} className="table-empty">Belum ada invoice.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
