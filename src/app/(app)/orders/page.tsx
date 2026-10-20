'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';
import { PrintReceipt, Receipt } from '@/components/receipt';
import { useToast } from '@/components/toast';
import {
  Badge,
  Button,
  Card,
  DateRange,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Table,
} from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dateTime, orderTypeLabel, paymentLabel, rupiah, todayKey } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import type { Order, OrderStatus, Paginated, PaymentMethod, Settings } from '@/lib/types';

const LIMIT = 20;

export default function OrdersPage() {
  const [range, setRange] = useState({ from: todayKey(), to: todayKey() });
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, loading, error, reload } = useLoad(
    () =>
      api<Paginated<Order>>('/orders', {
        query: { ...range, status, paymentMethod: method, search: query, page, limit: LIMIT },
      }),
    [range.from, range.to, status, method, query, page],
  );
  const settingsQ = useLoad(() => api<Settings>('/settings'));

  const pages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;
  const update = <T,>(setter: (v: T) => void) => (v: T) => {
    setPage(1);
    setter(v);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader title="Transaksi" description="Riwayat penjualan. Klik baris untuk melihat struk, mencetak ulang, atau membatalkan." />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <DateRange from={range.from} to={range.to} onChange={update(setRange)} />
          <Select aria-label="Status" value={status} onChange={(e) => update(setStatus)(e.target.value as OrderStatus | '')} className="w-44">
            <option value="">Semua status</option>
            <option value="PAID">Lunas</option>
            <option value="VOID">Dibatalkan</option>
          </Select>
          <Select aria-label="Metode bayar" value={method} onChange={(e) => update(setMethod)(e.target.value as PaymentMethod | '')} className="w-44">
            <option value="">Semua metode</option>
            {(Object.keys(paymentLabel) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>
                {paymentLabel[m]}
              </option>
            ))}
          </Select>
          <form
            className="relative min-w-52 flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              update(setQuery)(search);
            }}
          >
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder="No. invoice, meja, atau nama, lalu Enter"
              aria-label="Cari transaksi"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </form>
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="p-6 text-danger">{error}</p>
        ) : !data?.data.length ? (
          <EmptyState title="Belum ada transaksi">Coba ubah rentang tanggal atau filter.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Waktu</th>
                <th>Pesanan</th>
                <th>Kasir</th>
                <th>Bayar</th>
                <th className="text-right">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((o) => (
                <tr key={o.id} onClick={() => setSelectedId(o.id)} className="cursor-pointer hover:bg-canvas">
                  <td className="font-semibold">
                    <button className="text-left hover:underline" onClick={() => setSelectedId(o.id)}>
                      {o.invoiceNo}
                    </button>
                  </td>
                  <td className="whitespace-nowrap text-muted">{dateTime(o.createdAt)}</td>
                  <td>
                    {orderTypeLabel[o.orderType]}
                    {o.tableNo && <span className="text-muted"> · Meja {o.tableNo}</span>}
                    {o.customerName && <span className="block text-xs text-muted">{o.customerName}</span>}
                  </td>
                  <td>{o.user.name}</td>
                  <td>{paymentLabel[o.paymentMethod]}</td>
                  <td className="num text-right font-semibold">{rupiah(o.total)}</td>
                  <td>{o.status === 'PAID' ? <Badge tone="leaf">Lunas</Badge> : <Badge tone="danger">Dibatalkan</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {data && data.total > LIMIT && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
            <span className="text-muted">
              Halaman {page} dari {pages} ({data.total} transaksi)
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Sebelumnya
              </Button>
              <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </Card>

      <OrderDetailModal
        orderId={selectedId}
        settings={settingsQ.data}
        onClose={() => setSelectedId(null)}
        onChanged={reload}
      />
    </div>
  );
}

function OrderDetailModal({
  orderId,
  settings,
  onClose,
  onChanged,
}: {
  orderId: number | null;
  settings: Settings | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { isManager } = useAuth();
  const toast = useToast();
  const { data: order, setData, loading } = useLoad(
    () => (orderId ? api<Order>(`/orders/${orderId}`) : Promise.resolve(null)),
    [orderId],
  );
  const [printing, setPrinting] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  function close() {
    setVoiding(false);
    setReason('');
    onClose();
  }

  async function voidOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    setSaving(true);
    try {
      const updated = await api<Order>(`/orders/${order.id}/void`, { method: 'POST', body: { reason } });
      setData(updated);
      setVoiding(false);
      setReason('');
      toast(`${updated.invoiceNo} dibatalkan, stok dikembalikan`);
      onChanged();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={orderId !== null}
      onClose={close}
      title={order?.invoiceNo ?? 'Detail transaksi'}
      width="max-w-md"
      footer={
        order && (
          <>
            {isManager && order.status === 'PAID' && !voiding && (
              <Button variant="ghost" className="mr-auto text-danger" onClick={() => setVoiding(true)}>
                Batalkan transaksi
              </Button>
            )}
            <Button variant="outline" onClick={() => setPrinting(true)}>
              Cetak struk
            </Button>
          </>
        )
      }
    >
      {loading || !order ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          {order.status === 'VOID' && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              Dibatalkan {order.voidedAt && dateTime(order.voidedAt)}. Alasan: {order.voidReason}
            </p>
          )}
          {voiding && (
            <form onSubmit={voidOrder} className="space-y-3 rounded-lg border border-danger/40 p-3">
              <Field label="Alasan pembatalan" hint="Stok semua item akan dikembalikan.">
                <Input value={reason} onChange={(e) => setReason(e.target.value)} required autoFocus placeholder="Mis. salah input pesanan" />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setVoiding(false)}>
                  Kembali
                </Button>
                <Button type="submit" variant="danger" size="sm" loading={saving}>
                  Batalkan transaksi
                </Button>
              </div>
            </form>
          )}
          <div className="rounded-lg border border-line bg-canvas/50 p-4">
            <Receipt order={order} settings={settings} />
          </div>
        </div>
      )}
      {printing && order && <PrintReceipt order={order} settings={settings} onDone={() => setPrinting(false)} />}
    </Modal>
  );
}
