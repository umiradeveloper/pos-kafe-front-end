'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useToast } from '@/components/toast';
import { Badge, Button, Card, Checkbox, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Table, cx } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { dateTime, stockTypeLabel } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import type { Product, StockMovement } from '@/lib/types';

type AdjustType = 'IN' | 'OUT' | 'ADJUST';

const adjustCopy: Record<AdjustType, { label: string; qtyLabel: string; placeholder: string }> = {
  IN: { label: 'Stok masuk', qtyLabel: 'Jumlah masuk', placeholder: 'Mis. restock dari supplier' },
  OUT: { label: 'Stok keluar', qtyLabel: 'Jumlah keluar', placeholder: 'Mis. rusak, tumpah, kedaluwarsa' },
  ADJUST: { label: 'Stok opname', qtyLabel: 'Jumlah fisik saat ini', placeholder: 'Mis. hasil hitung akhir bulan' },
};

export default function StockPage() {
  const toast = useToast();
  const productsQ = useLoad(() => api<Product[]>('/products'));
  const movementsQ = useLoad(() => api<StockMovement[]>('/stock/movements'));

  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [target, setTarget] = useState<Product | null>(null);
  const [type, setType] = useState<AdjustType>('IN');
  const [qty, setQty] = useState(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const tracked = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (productsQ.data ?? []).filter(
      (p) => p.trackStock && (!q || p.name.toLowerCase().includes(q)) && (!lowOnly || p.stock <= p.minStock),
    );
  }, [productsQ.data, search, lowOnly]);

  function open(p: Product, t: AdjustType) {
    setTarget(p);
    setType(t);
    setQty(t === 'ADJUST' ? p.stock : 0);
    setNote('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setSaving(true);
    try {
      await api('/stock/adjust', { method: 'POST', body: { productId: target.id, type, qty, note } });
      toast(`Stok ${target.name} diperbarui`);
      setTarget(null);
      productsQ.reload();
      movementsQ.reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  const preview = target ? (type === 'IN' ? target.stock + qty : type === 'OUT' ? target.stock - qty : qty) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader title="Stok" description="Stok berkurang otomatis saat terjual. Catat barang masuk, keluar, dan hasil stok opname di sini." />

      <Card>
        <div className="flex flex-wrap items-center gap-4 border-b border-line p-4">
          <div className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Cari produk" aria-label="Cari produk" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Checkbox label="Hanya stok menipis" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
        </div>
        {productsQ.loading ? (
          <Spinner />
        ) : tracked.length === 0 ? (
          <EmptyState title={lowOnly ? 'Tidak ada stok yang menipis' : 'Tidak ada produk dengan stok'} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Produk</th>
                <th className="text-right">Stok</th>
                <th className="text-right">Minimum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tracked.map((p) => (
                <tr key={p.id}>
                  <td className="font-semibold">
                    {p.name}
                    {!p.isActive && <span className="ml-2 text-xs font-normal text-muted">(nonaktif)</span>}
                  </td>
                  <td className="num text-right">
                    {p.stock <= p.minStock ? <Badge tone={p.stock <= 0 ? 'danger' : 'warn'}>{p.stock}</Badge> : p.stock}
                  </td>
                  <td className="num text-right text-muted">{p.minStock}</td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => open(p, 'IN')}>
                        Masuk
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => open(p, 'OUT')}>
                        Keluar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => open(p, 'ADJUST')}>
                        Opname
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <h2 className="px-5 pt-5 pb-2 font-bold">Riwayat pergerakan stok</h2>
        {movementsQ.loading ? (
          <Spinner />
        ) : !movementsQ.data?.length ? (
          <EmptyState title="Belum ada pergerakan stok" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Produk</th>
                <th>Jenis</th>
                <th className="text-right">Perubahan</th>
                <th className="text-right">Stok akhir</th>
                <th>Keterangan</th>
                <th>Oleh</th>
              </tr>
            </thead>
            <tbody>
              {movementsQ.data.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap text-muted">{dateTime(m.createdAt)}</td>
                  <td className="font-medium">{m.product.name}</td>
                  <td>{stockTypeLabel[m.type]}</td>
                  <td className={cx('num text-right font-semibold', m.qty < 0 ? 'text-danger' : 'text-leaf-dark')}>
                    {m.qty > 0 ? '+' : ''}
                    {m.qty}
                  </td>
                  <td className="num text-right">{m.stockAfter}</td>
                  <td className="text-muted">{m.reference ?? m.note ?? '-'}</td>
                  <td className="text-muted">{m.user?.name ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={target ? `${adjustCopy[type].label}: ${target.name}` : ''}
        width="max-w-sm"
      >
        {target && (
          <form onSubmit={save} className="space-y-4">
            <Select aria-label="Jenis perubahan" value={type} onChange={(e) => {
              const t = e.target.value as AdjustType;
              setType(t);
              setQty(t === 'ADJUST' ? target.stock : 0);
            }}>
              {(Object.keys(adjustCopy) as AdjustType[]).map((t) => (
                <option key={t} value={t}>
                  {adjustCopy[t].label}
                </option>
              ))}
            </Select>
            <Field label={adjustCopy[type].qtyLabel}>
              <Input type="number" min={0} value={qty} onChange={(e) => setQty(Math.max(0, Number(e.target.value)))} required />
            </Field>
            <Field label="Keterangan">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={adjustCopy[type].placeholder} required />
            </Field>
            <p className={cx('rounded-lg px-3 py-2 text-sm', preview < 0 ? 'bg-danger-soft text-danger' : 'bg-canvas')}>
              Stok {target.stock} → <strong className="num">{preview}</strong>
              {preview < 0 && ' (tidak boleh minus)'}
            </p>
            <Button type="submit" className="w-full" loading={saving} disabled={preview < 0 || (type !== 'ADJUST' && qty === 0)}>
              Simpan {adjustCopy[type].label.toLowerCase()}
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
