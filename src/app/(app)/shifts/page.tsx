'use client';

import { useState } from 'react';
import { ShiftSummaryView } from '@/components/shift-summary';
import { Badge, Card, DateRange, EmptyState, Modal, PageHeader, Spinner, Table } from '@/components/ui';
import { api } from '@/lib/api';
import { dateTime, rupiah, todayKey } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import type { Shift, ShiftSummary } from '@/lib/types';

export default function ShiftHistoryPage() {
  const [range, setRange] = useState({ from: todayKey(-6), to: todayKey() });
  const [selected, setSelected] = useState<number | null>(null);
  const { data, loading, error } = useLoad(() => api<Shift[]>('/shifts', { query: range }), [range.from, range.to]);
  const detail = useLoad(
    () => (selected ? api<{ shift: Shift; summary: ShiftSummary }>(`/shifts/${selected}`) : Promise.resolve(null)),
    [selected],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Riwayat shift"
        description="Cek selisih kas setiap kasir. Selisih muncul jika uang fisik saat tutup tidak sama dengan perhitungan sistem."
        actions={<DateRange from={range.from} to={range.to} onChange={setRange} />}
      />

      <Card>
        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="p-6 text-danger">{error}</p>
        ) : !data?.length ? (
          <EmptyState title="Tidak ada shift di periode ini" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Kasir</th>
                <th>Dibuka</th>
                <th>Ditutup</th>
                <th className="text-right">Transaksi</th>
                <th className="text-right">Modal awal</th>
                <th className="text-right">Kas seharusnya</th>
                <th className="text-right">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} onClick={() => setSelected(s.id)} className="cursor-pointer hover:bg-canvas">
                  <td className="font-semibold">
                    <button className="hover:underline" onClick={() => setSelected(s.id)}>
                      {s.user?.name}
                    </button>
                  </td>
                  <td className="whitespace-nowrap text-muted">{dateTime(s.openedAt)}</td>
                  <td className="whitespace-nowrap">
                    {s.closedAt ? <span className="text-muted">{dateTime(s.closedAt)}</span> : <Badge tone="leaf">Masih buka</Badge>}
                  </td>
                  <td className="num text-right">{s._count?.orders ?? 0}</td>
                  <td className="num text-right">{rupiah(s.openingCash)}</td>
                  <td className="num text-right">{s.expectedCash !== null ? rupiah(s.expectedCash) : '-'}</td>
                  <td className="num text-right">
                    {s.difference === null ? (
                      '-'
                    ) : s.difference === 0 ? (
                      <Badge tone="leaf">Cocok</Badge>
                    ) : (
                      <Badge tone="danger">
                        {s.difference > 0 ? '+' : ''}
                        {rupiah(s.difference)}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={selected !== null} onClose={() => setSelected(null)} title="Detail shift" width="max-w-3xl">
        {detail.loading || !detail.data ? (
          <Spinner />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {detail.data.shift.user?.name} · dibuka {dateTime(detail.data.shift.openedAt)}
              {detail.data.shift.closedAt && `, ditutup ${dateTime(detail.data.shift.closedAt)}`}
            </p>
            <ShiftSummaryView shift={detail.data.shift} summary={detail.data.summary} />
            {!!detail.data.shift.cashMovements?.length && (
              <div>
                <h3 className="mb-1 font-bold">Kas masuk/keluar</h3>
                <ul className="divide-y divide-line text-sm">
                  {detail.data.shift.cashMovements.map((m) => (
                    <li key={m.id} className="flex justify-between py-1.5">
                      <span>{m.note}</span>
                      <span className="num">
                        {m.type === 'OUT' ? '-' : '+'}
                        {rupiah(m.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {detail.data.shift.note && <p className="rounded-lg bg-canvas p-3 text-sm">Catatan: {detail.data.shift.note}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
