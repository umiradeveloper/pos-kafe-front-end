import type { OrderType, PaymentMethod, Role, StockMovementType } from './types';

const idr = new Intl.NumberFormat('id-ID');

export const rupiah = (n: number) => `Rp ${idr.format(Math.round(n))}`;
export const number = (n: number) => idr.format(n);

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

/** Tanggal lokal hari ini dalam format YYYY-MM-DD */
export function todayKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const shortDate = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

export const paymentLabel: Record<PaymentMethod, string> = {
  CASH: 'Tunai',
  QRIS: 'QRIS',
  CARD: 'Kartu',
  EWALLET: 'E-wallet',
};

export const orderTypeLabel: Record<OrderType, string> = {
  DINE_IN: 'Makan di tempat',
  TAKEAWAY: 'Bawa pulang',
};

export const roleLabel: Record<Role, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  CASHIER: 'Kasir',
};

export const stockTypeLabel: Record<StockMovementType, string> = {
  IN: 'Stok masuk',
  OUT: 'Stok keluar',
  ADJUST: 'Stok opname',
  SALE: 'Terjual',
  VOID: 'Batal transaksi',
};

/** Hitung pajak & service persis seperti backend */
export function calcTotals(subtotal: number, discount: number, servicePercent: number, taxPercent: number) {
  const disc = Math.min(Math.max(discount, 0), subtotal);
  const base = subtotal - disc;
  const serviceCharge = Math.round((base * servicePercent) / 100);
  const tax = Math.round(((base + serviceCharge) * taxPercent) / 100);
  return { subtotal, discount: disc, serviceCharge, tax, total: base + serviceCharge + tax };
}

/** Pecahan uang yang wajar untuk tombol cepat pembayaran tunai */
export function cashSuggestions(total: number): number[] {
  const set = new Set<number>([total]);
  for (const step of [5000, 10000, 20000, 50000, 100000]) {
    set.add(Math.ceil(total / step) * step);
  }
  return [...set].filter((v) => v >= total).sort((a, b) => a - b).slice(0, 5);
}
