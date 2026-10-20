'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { dateTime, number, orderTypeLabel, paymentLabel } from '@/lib/format';
import type { Order, Settings } from '@/lib/types';

const Row = ({ left, right, bold }: { left: React.ReactNode; right: React.ReactNode; bold?: boolean }) => (
  <div className={`flex justify-between gap-2 ${bold ? 'font-bold' : ''}`}>
    <span>{left}</span>
    <span className="num shrink-0">{right}</span>
  </div>
);

const Rule = () => <div className="my-1.5 border-t border-dashed border-current opacity-60" />;

/** Isi struk. Dipakai untuk pratinjau di layar dan untuk dicetak. */
export function Receipt({ order, settings }: { order: Order; settings: Settings | null }) {
  return (
    <div className="font-mono text-[12px] leading-snug text-ink print:text-black">
      <div className="text-center">
        <p className="text-[14px] font-bold">{settings?.storeName ?? 'Kafe'}</p>
        {settings?.address && <p>{settings.address}</p>}
        {settings?.phone && <p>{settings.phone}</p>}
      </div>
      <Rule />
      <Row left="No" right={order.invoiceNo} />
      <Row left="Waktu" right={dateTime(order.createdAt)} />
      <Row left="Kasir" right={order.user?.name ?? '-'} />
      <Row
        left={orderTypeLabel[order.orderType]}
        right={order.tableNo ? `Meja ${order.tableNo}` : order.customerName ?? ''}
      />
      {order.tableNo && order.customerName && <Row left="Nama" right={order.customerName} />}
      <Rule />
      {order.items?.map((it) => (
        <div key={it.id} className="mb-1">
          <p>{it.productName}</p>
          <Row left={`  ${it.qty} x ${number(it.price)}`} right={number(it.subtotal)} />
          {it.note && <p className="pl-2 italic">* {it.note}</p>}
        </div>
      ))}
      <Rule />
      <Row left="Subtotal" right={number(order.subtotal)} />
      {order.discount > 0 && <Row left="Diskon" right={`-${number(order.discount)}`} />}
      {order.serviceCharge > 0 && <Row left="Service" right={number(order.serviceCharge)} />}
      {order.tax > 0 && <Row left="Pajak" right={number(order.tax)} />}
      <Row bold left="TOTAL" right={number(order.total)} />
      <Rule />
      <Row left={paymentLabel[order.paymentMethod]} right={number(order.paidAmount)} />
      {order.changeAmount > 0 && <Row left="Kembali" right={number(order.changeAmount)} />}
      {order.status === 'VOID' && (
        <p className="mt-2 text-center font-bold">*** TRANSAKSI DIBATALKAN ***</p>
      )}
      <Rule />
      <p className="text-center">{settings?.receiptFooter ?? 'Terima kasih!'}</p>
    </div>
  );
}

/**
 * Tampilkan struk di area cetak lalu buka dialog print browser.
 * Pasang komponen ini saat ingin mencetak; onDone dipanggil setelah dialog ditutup.
 */
export function PrintReceipt({ order, settings, onDone }: { order: Order; settings: Settings | null; onDone: () => void }) {
  useEffect(() => {
    const after = () => onDone();
    window.addEventListener('afterprint', after, { once: true });
    const t = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', after);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  return createPortal(
    <div id="print-root">
      <Receipt order={order} settings={settings} />
    </div>,
    document.body,
  );
}
