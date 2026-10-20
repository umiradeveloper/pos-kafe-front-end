'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BarChart } from '@/components/bar-chart';
import { Badge, Card, DateRange, EmptyState, PageHeader, Spinner, Table, cx } from '@/components/ui';
import { api } from '@/lib/api';
import { number, orderTypeLabel, paymentLabel, rupiah, shortDate, todayKey } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import type { OrderType, ReportSummary } from '@/lib/types';

const PRESETS = [
  { label: 'Hari ini', from: 0, to: 0 },
  { label: 'Kemarin', from: -1, to: -1 },
  { label: '7 hari', from: -6, to: 0 },
  { label: '30 hari', from: -29, to: 0 },
];

export default function DashboardPage() {
  const [range, setRange] = useState({ from: todayKey(), to: todayKey() });
  const { data, loading, error } = useLoad(
    () => api<ReportSummary>('/reports/summary', { query: range }),
    [range.from, range.to],
  );

  const singleDay = range.from === range.to;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader title="Dashboard" description="Ringkasan penjualan dari transaksi yang lunas." />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const r = { from: todayKey(p.from), to: todayKey(p.to) };
          const active = r.from === range.from && r.to === range.to;
          return (
            <button
              key={p.label}
              onClick={() => setRange(r)}
              aria-pressed={active}
              className={cx(
                'rounded-full border px-4 py-1.5 text-sm font-semibold',
                active ? 'border-leaf bg-leaf text-white' : 'border-line bg-surface hover:border-leaf',
              )}
            >
              {p.label}
            </button>
          );
        })}
        <div className="ml-auto">
          <DateRange from={range.from} to={range.to} onChange={setRange} />
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : data ? (
        <div className="space-y-6">
          {/* Angka utama */}
          <Card className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            <Stat label="Total diterima" value={rupiah(data.totals.totalCollected)} note={`${number(data.totals.orderCount)} transaksi`} big />
            <Stat label="Rata-rata per transaksi" value={rupiah(data.totals.averageOrder)} note={`${number(data.totals.itemsSold)} item terjual`} />
            <Stat
              label="Laba kotor"
              value={rupiah(data.totals.grossProfit)}
              note={
                data.totals.netSales > 0
                  ? `Margin ${Math.round((data.totals.grossProfit / data.totals.netSales) * 100)}% dari penjualan bersih`
                  : 'Penjualan bersih dikurangi HPP'
              }
            />
            <Stat
              label="Diskon & pembatalan"
              value={rupiah(data.totals.discount)}
              note={`${data.totals.voidCount} transaksi dibatalkan`}
            />
          </Card>

          {/* Grafik */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="p-5 lg:col-span-3">
              <h2 className="font-bold">{singleDay ? 'Penjualan per jam' : 'Penjualan per hari'}</h2>
              <p className="mb-4 text-xs text-muted">Total diterima, termasuk pajak dan service</p>
              {data.totals.orderCount === 0 ? (
                <EmptyState title="Belum ada penjualan di periode ini" />
              ) : singleDay ? (
                <BarChart
                  title="Penjualan per jam"
                  height={260}
                  format={rupiah}
                  labelEvery={3}
                  data={trimHours(data.hourly).map((h) => ({
                    label: String(h.hour).padStart(2, '0'),
                    fullLabel: `Pukul ${String(h.hour).padStart(2, '0')}.00–${String(h.hour).padStart(2, '0')}.59`,
                    value: h.total,
                    sub: `${h.count} transaksi`,
                  }))}
                />
              ) : (
                <BarChart
                  title="Penjualan per hari"
                  height={260}
                  format={rupiah}
                  labelEvery={Math.ceil(data.daily.length / 10)}
                  data={data.daily.map((d) => ({
                    label: shortDate(d.date),
                    fullLabel: new Date(`${d.date}T00:00:00`).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    }),
                    value: d.total,
                    sub: `${d.count} transaksi`,
                  }))}
                />
              )}
            </Card>

            <Card className="p-5 lg:col-span-2">
              <h2 className="mb-4 font-bold">Metode pembayaran</h2>
              <ShareBars
                rows={data.payments.map((p) => ({ label: paymentLabel[p.method], value: p.total, count: p.count }))}
              />
              <h2 className="mt-6 mb-4 font-bold">Jenis pesanan</h2>
              <ShareBars
                rows={(Object.keys(data.orderTypes) as OrderType[]).map((t) => ({
                  label: orderTypeLabel[t],
                  value: data.orderTypes[t].total,
                  count: data.orderTypes[t].count,
                }))}
              />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="px-5 pt-5 pb-2 font-bold">Menu terlaris</h2>
              {data.topProducts.length === 0 ? (
                <EmptyState title="Belum ada data" />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th>Menu</th>
                      <th className="text-right">Terjual</th>
                      <th className="text-right">Penjualan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((p) => (
                      <tr key={p.name}>
                        <td className="font-medium">{p.name}</td>
                        <td className="num text-right">{number(p.qty)}</td>
                        <td className="num text-right">{rupiah(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>

            <div className="space-y-6">
              <Card>
                <h2 className="px-5 pt-5 pb-2 font-bold">Per kasir</h2>
                {data.byCashier.length === 0 ? (
                  <EmptyState title="Belum ada data" />
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <th>Kasir</th>
                        <th className="text-right">Transaksi</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byCashier.map((c) => (
                        <tr key={c.userId}>
                          <td className="font-medium">{c.name}</td>
                          <td className="num text-right">{number(c.count)}</td>
                          <td className="num text-right">{rupiah(c.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card>

              <Card>
                <div className="flex items-baseline justify-between px-5 pt-5 pb-2">
                  <h2 className="font-bold">Stok menipis</h2>
                  <Link href="/stock" className="text-sm font-semibold text-leaf hover:underline">
                    Kelola stok
                  </Link>
                </div>
                {data.lowStock.length === 0 ? (
                  <p className="px-5 pb-5 text-sm text-muted">Semua stok masih di atas batas minimum.</p>
                ) : (
                  <ul className="divide-y divide-line px-5 pb-3 text-sm">
                    {data.lowStock.map((p) => (
                      <li key={p.id} className="flex items-center justify-between py-2">
                        <span>{p.name}</span>
                        <Badge tone={p.stock <= 0 ? 'danger' : 'warn'}>
                          {p.stock <= 0 ? 'Habis' : `Sisa ${p.stock}`} / min {p.minStock}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          <Card className="p-5">
            <h2 className="mb-3 font-bold">Rincian penjualan</h2>
            <dl className="num grid gap-x-10 gap-y-1 text-sm sm:grid-cols-2">
              <Row label="Penjualan kotor (harga menu)" value={data.totals.grossSales} />
              <Row label="Diskon" value={-data.totals.discount} />
              <Row label="Penjualan bersih" value={data.totals.netSales} strong />
              <Row label="HPP (modal)" value={-data.totals.cogs} />
              <Row label="Service charge" value={data.totals.serviceCharge} />
              <Row label="Pajak" value={data.totals.tax} />
              <Row label="Total diterima" value={data.totals.totalCollected} strong />
              <Row label="Laba kotor" value={data.totals.grossProfit} strong />
            </dl>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

/** Buang jam-jam sepi di awal & akhir hari agar grafik fokus ke jam buka */
function trimHours(hours: ReportSummary['hourly']) {
  const first = hours.findIndex((h) => h.count > 0);
  const last = hours.length - 1 - [...hours].reverse().findIndex((h) => h.count > 0);
  if (first < 0) return hours;
  return hours.slice(Math.max(0, first - 1), Math.min(24, last + 2));
}

function Stat({ label, value, note, big }: { label: string; value: string; note: string; big?: boolean }) {
  return (
    <div className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={cx('num mt-1 font-extrabold tracking-tight', big ? 'text-3xl text-leaf-dark' : 'text-2xl')}>{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={cx('flex justify-between border-b border-line/60 py-1.5', strong && 'font-bold')}>
      <dt className={strong ? '' : 'text-muted'}>{label}</dt>
      <dd>{value < 0 ? `-${rupiah(-value)}` : rupiah(value)}</dd>
    </div>
  );
}

/** Bar horizontal porsi tiap kategori terhadap total */
function ShareBars({ rows }: { rows: { label: string; value: number; count: number }[] }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const pct = total ? (r.value / total) * 100 : 0;
        return (
          <li key={r.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span>
                {r.label} <span className="text-muted">({r.count})</span>
              </span>
              <span className="num font-semibold">
                {rupiah(r.value)} <span className="font-normal text-muted">{Math.round(pct)}%</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-grid">
              <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: 'var(--color-chart)' }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
