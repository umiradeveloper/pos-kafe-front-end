import { paymentLabel, rupiah } from '@/lib/format';
import type { Shift, ShiftSummary } from '@/lib/types';
import { cx } from './ui';

const Line = ({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'danger' | 'leaf' }) => (
  <div className={cx('flex justify-between gap-4 py-1.5 text-sm', strong && 'font-bold')}>
    <span className={strong ? '' : 'text-muted'}>{label}</span>
    <span className={cx('num', tone === 'danger' && 'text-danger', tone === 'leaf' && 'text-leaf-dark')}>{value}</span>
  </div>
);

/** Rekap penjualan per metode bayar dan perhitungan kas laci. */
export function ShiftSummaryView({ shift, summary }: { shift: Shift; summary: ShiftSummary }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="mb-1 font-bold">Penjualan</h3>
        {summary.payments.map((p) => (
          <Line key={p.method} label={`${paymentLabel[p.method]} (${p.count})`} value={rupiah(p.total)} />
        ))}
        <div className="mt-1 border-t border-line">
          <Line strong label={`Total (${summary.orderCount} transaksi)`} value={rupiah(summary.totalSales)} />
        </div>
        {summary.voidCount > 0 && <p className="mt-1 text-xs text-muted">{summary.voidCount} transaksi dibatalkan tidak dihitung.</p>}
      </div>
      <div>
        <h3 className="mb-1 font-bold">Kas di laci</h3>
        <Line label="Modal awal" value={rupiah(summary.openingCash)} />
        <Line label="Penjualan tunai" value={rupiah(summary.cashSales)} />
        <Line label="Kas masuk lain" value={rupiah(summary.cashIn)} />
        <Line label="Kas keluar" value={`-${rupiah(summary.cashOut)}`} />
        <div className="mt-1 border-t border-line">
          <Line strong label="Seharusnya ada" value={rupiah(shift.expectedCash ?? summary.expectedCash)} />
        </div>
        {shift.status === 'CLOSED' && shift.closingCash !== null && (
          <>
            <Line label="Uang fisik dihitung" value={rupiah(shift.closingCash)} />
            <Line
              strong
              label="Selisih"
              value={`${(shift.difference ?? 0) > 0 ? '+' : ''}${rupiah(shift.difference ?? 0)}`}
              tone={(shift.difference ?? 0) === 0 ? 'leaf' : 'danger'}
            />
          </>
        )}
      </div>
    </div>
  );
}
