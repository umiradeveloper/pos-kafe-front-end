'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ShiftSummaryView } from '@/components/shift-summary';
import { useToast } from '@/components/toast';
import { Button, Card, Field, Input, MoneyInput, PageHeader, Select, Spinner, Textarea, cx } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { dateTime, rupiah, time } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import type { CashMovement, Shift, ShiftSummary } from '@/lib/types';

export default function MyShiftPage() {
  const toast = useToast();
  const current = useLoad(() => api<{ shift: Shift | null; summary: ShiftSummary | null }>('/shifts/current'));
  const detail = useLoad(
    () =>
      current.data?.shift
        ? api<{ shift: Shift; summary: ShiftSummary }>(`/shifts/${current.data.shift.id}`)
        : Promise.resolve(null),
    [current.data?.shift?.id],
  );
  const [closed, setClosed] = useState<{ shift: Shift; summary: ShiftSummary } | null>(null);

  // Form kas masuk/keluar
  const [cashType, setCashType] = useState<'IN' | 'OUT'>('OUT');
  const [cashAmount, setCashAmount] = useState(0);
  const [cashNote, setCashNote] = useState('');
  const [savingCash, setSavingCash] = useState(false);

  // Form tutup shift
  const [closingCash, setClosingCash] = useState(0);
  const [closeNote, setCloseNote] = useState('');
  const [closing, setClosing] = useState(false);

  async function addCash(e: React.FormEvent) {
    e.preventDefault();
    setSavingCash(true);
    try {
      await api('/shifts/cash', { method: 'POST', body: { type: cashType, amount: cashAmount, note: cashNote } });
      toast(cashType === 'IN' ? 'Kas masuk dicatat' : 'Kas keluar dicatat');
      setCashAmount(0);
      setCashNote('');
      detail.reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSavingCash(false);
    }
  }

  async function closeShift(e: React.FormEvent) {
    e.preventDefault();
    if (!detail.data) return;
    if (!confirm('Tutup shift sekarang? Setelah ditutup, Anda perlu membuka shift baru untuk bertransaksi.')) return;
    setClosing(true);
    try {
      const shift = await api<Shift>('/shifts/close', { method: 'POST', body: { closingCash, note: closeNote || undefined } });
      setClosed({ shift, summary: detail.data.summary });
      toast('Shift ditutup');
      current.reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setClosing(false);
    }
  }

  if (current.loading) return <Spinner />;

  if (closed) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <PageHeader title="Shift ditutup" description={`Dibuka ${dateTime(closed.shift.openedAt)}, ditutup ${dateTime(closed.shift.closedAt!)}`} />
        <Card className="p-6">
          <ShiftSummaryView shift={closed.shift} summary={closed.summary} />
        </Card>
        <div className="mt-4 flex gap-2">
          <Link href="/pos" className="inline-flex h-10 items-center rounded-lg bg-leaf px-4 text-sm font-semibold text-white">
            Buka shift baru
          </Link>
        </div>
      </div>
    );
  }

  if (!current.data?.shift) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <PageHeader title="Shift saya" />
        <Card className="p-6">
          <p className="text-sm text-muted">Anda belum membuka shift. Shift dibuka dari halaman Kasir dengan mengisi modal awal di laci.</p>
          <Link href="/pos" className="mt-4 inline-flex h-10 items-center rounded-lg bg-leaf px-4 text-sm font-semibold text-white">
            Ke halaman Kasir
          </Link>
        </Card>
      </div>
    );
  }

  const data = detail.data;
  const expected = data?.summary.expectedCash ?? 0;
  const diff = closingCash - expected;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader title="Shift saya" description={`Dibuka ${dateTime(current.data.shift.openedAt)}`} />

      <Card className="p-6">{!data ? <Spinner /> : <ShiftSummaryView shift={data.shift} summary={data.summary} />}</Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-bold">Kas masuk / keluar</h2>
          <p className="mb-4 text-sm text-muted">Catat uang yang masuk atau keluar dari laci selain penjualan, mis. beli es batu.</p>
          <form onSubmit={addCash} className="space-y-3">
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <Select aria-label="Jenis" value={cashType} onChange={(e) => setCashType(e.target.value as 'IN' | 'OUT')}>
                <option value="OUT">Keluar</option>
                <option value="IN">Masuk</option>
              </Select>
              <MoneyInput aria-label="Jumlah" value={cashAmount} onChange={setCashAmount} />
            </div>
            <Input placeholder="Keterangan" aria-label="Keterangan" value={cashNote} onChange={(e) => setCashNote(e.target.value)} required />
            <Button type="submit" variant="outline" className="w-full" loading={savingCash} disabled={!cashAmount}>
              Catat kas {cashType === 'IN' ? 'masuk' : 'keluar'}
            </Button>
          </form>

          {!!data?.shift.cashMovements?.length && (
            <ul className="mt-4 divide-y divide-line border-t border-line text-sm">
              {data.shift.cashMovements.map((m: CashMovement) => (
                <li key={m.id} className="flex justify-between gap-3 py-2">
                  <span>
                    <span className="text-muted">{time(m.createdAt)}</span> {m.note}
                  </span>
                  <span className={cx('num font-semibold', m.type === 'OUT' ? 'text-danger' : 'text-leaf-dark')}>
                    {m.type === 'OUT' ? '-' : '+'}
                    {rupiah(m.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-bold">Tutup shift</h2>
          <p className="mb-4 text-sm text-muted">Hitung semua uang tunai di laci, lalu masukkan jumlahnya di sini.</p>
          <form onSubmit={closeShift} className="space-y-3">
            <Field label="Uang fisik di laci">
              <MoneyInput value={closingCash} onChange={setClosingCash} />
            </Field>
            {data && (
              <p className={cx('text-sm', diff === 0 ? 'text-leaf-dark' : 'text-danger')}>
                {diff === 0
                  ? 'Kas cocok.'
                  : diff > 0
                    ? `Lebih ${rupiah(diff)} dari yang seharusnya (${rupiah(expected)}).`
                    : `Kurang ${rupiah(-diff)} dari yang seharusnya (${rupiah(expected)}).`}
              </p>
            )}
            <Textarea placeholder="Catatan (opsional)" aria-label="Catatan" value={closeNote} onChange={(e) => setCloseNote(e.target.value)} />
            <Button type="submit" variant="danger" className="w-full" loading={closing}>
              Tutup shift
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
