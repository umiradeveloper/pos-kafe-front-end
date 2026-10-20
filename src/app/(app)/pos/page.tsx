'use client';

import { Minus, NotebookPen, Plus, Search, ShoppingBag, Trash2, Utensils } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { PrintReceipt } from '@/components/receipt';
import { useToast } from '@/components/toast';
import { Badge, Button, Card, Field, Input, Modal, MoneyInput, Spinner, cx } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { calcTotals, cashSuggestions, number, paymentLabel, rupiah } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import type { Category, Order, OrderType, PaymentMethod, Product, Settings, Shift, ShiftSummary } from '@/lib/types';

interface CartLine {
  key: string;
  product: Product;
  qty: number;
  note: string;
}

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'QRIS', 'CARD', 'EWALLET'];

export default function PosPage() {
  const toast = useToast();

  const shiftQ = useLoad(() => api<{ shift: Shift | null; summary: ShiftSummary | null }>('/shifts/current'));
  const catalogQ = useLoad(() =>
    Promise.all([
      api<Category[]>('/categories'),
      api<Product[]>('/products', { query: { active: 'true' } }),
      api<Settings>('/settings'),
    ]),
  );
  const [categories, products, settings] = catalogQ.data ?? [[], [], null];

  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<number | 'all'>('all');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [tableNo, setTableNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount] = useState(0);
  const [noteFor, setNoteFor] = useState<CartLine | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [completed, setCompleted] = useState<Order | null>(null);
  const [printing, setPrinting] = useState<Order | null>(null);
  const [cartOpenMobile, setCartOpenMobile] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (activeCat === 'all' || p.categoryId === activeCat) &&
        (!q || p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)),
    );
  }, [products, search, activeCat]);

  const qtyInCart = (productId: number) => cart.filter((l) => l.product.id === productId).reduce((s, l) => s + l.qty, 0);
  const canAdd = (p: Product, extra = 1) => !p.trackStock || qtyInCart(p.id) + extra <= p.stock;

  const subtotal = cart.reduce((s, l) => s + l.product.price * l.qty, 0);
  const totals = calcTotals(subtotal, discount, settings?.servicePercent ?? 0, settings?.taxPercent ?? 0);
  const itemCount = cart.reduce((s, l) => s + l.qty, 0);

  function addProduct(p: Product) {
    if (!canAdd(p)) {
      toast(`Stok ${p.name} tinggal ${p.stock}`, 'error');
      return;
    }
    setCart((c) => {
      const idx = c.findIndex((l) => l.product.id === p.id && l.note === '');
      if (idx >= 0) return c.map((l, i) => (i === idx ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { key: `${p.id}-${Date.now()}`, product: p, qty: 1, note: '' }];
    });
  }

  function changeQty(line: CartLine, delta: number) {
    if (delta > 0 && !canAdd(line.product, delta)) {
      toast(`Stok ${line.product.name} tinggal ${line.product.stock}`, 'error');
      return;
    }
    setCart((c) =>
      c.flatMap((l) => (l.key !== line.key ? [l] : l.qty + delta <= 0 ? [] : [{ ...l, qty: l.qty + delta }])),
    );
  }

  function resetOrder() {
    setCart([]);
    setTableNo('');
    setCustomerName('');
    setDiscount(0);
    setOrderType('DINE_IN');
    setCartOpenMobile(false);
  }

  if (shiftQ.loading || catalogQ.loading) return <Spinner />;
  if (catalogQ.error || shiftQ.error) {
    return <p className="p-8 text-danger">{catalogQ.error ?? shiftQ.error}</p>;
  }
  if (!shiftQ.data?.shift) return <OpenShiftGate onOpened={shiftQ.reload} />;

  const ticket = (
    <div className="ticket flex h-full flex-col px-5 pt-6 pb-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-extrabold">Pesanan</h2>
        <span className="text-sm text-muted">{itemCount} item</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-canvas p-1" role="radiogroup" aria-label="Jenis pesanan">
        {(['DINE_IN', 'TAKEAWAY'] as OrderType[]).map((t) => (
          <button
            key={t}
            role="radio"
            aria-checked={orderType === t}
            onClick={() => setOrderType(t)}
            className={cx(
              'flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-semibold',
              orderType === t ? 'bg-surface text-leaf-dark shadow-sm' : 'text-muted',
            )}
          >
            {t === 'DINE_IN' ? <Utensils className="size-4" /> : <ShoppingBag className="size-4" />}
            {t === 'DINE_IN' ? 'Makan di sini' : 'Bawa pulang'}
          </button>
        ))}
      </div>
      <div className={cx('mt-2 grid gap-2', orderType === 'DINE_IN' && 'grid-cols-[88px_1fr]')}>
        {orderType === 'DINE_IN' && (
          <Input placeholder="Meja" aria-label="Nomor meja" value={tableNo} onChange={(e) => setTableNo(e.target.value)} />
        )}
        <Input
          placeholder="Nama pelanggan"
          aria-label="Nama pelanggan"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
      </div>

      <div className="ticket-rule my-4" />

      <ul className="-mx-2 flex-1 space-y-1 overflow-y-auto px-2">
        {cart.length === 0 && (
          <li className="py-10 text-center text-sm text-muted">Pilih menu di sebelah kiri untuk mulai mencatat pesanan.</li>
        )}
        {cart.map((l) => (
          <li key={l.key} className="rounded-lg py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{l.product.name}</p>
                <p className="num text-xs text-muted">{rupiah(l.product.price)}</p>
                {l.note && <p className="mt-0.5 text-xs italic text-leaf">{l.note}</p>}
              </div>
              <p className="num shrink-0 text-sm font-semibold">{number(l.product.price * l.qty)}</p>
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              <button onClick={() => changeQty(l, -1)} className="rounded-md border border-line p-1 hover:border-leaf" aria-label={`Kurangi ${l.product.name}`}>
                <Minus className="size-3.5" />
              </button>
              <span className="num w-8 text-center text-sm font-bold">{l.qty}</span>
              <button onClick={() => changeQty(l, 1)} className="rounded-md border border-line p-1 hover:border-leaf" aria-label={`Tambah ${l.product.name}`}>
                <Plus className="size-3.5" />
              </button>
              <button onClick={() => setNoteFor(l)} className="ml-2 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted hover:text-leaf">
                <NotebookPen className="size-3.5" /> Catatan
              </button>
              <button
                onClick={() => setCart((c) => c.filter((x) => x.key !== l.key))}
                className="ml-auto rounded-md p-1 text-muted hover:text-danger"
                aria-label={`Hapus ${l.product.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="ticket-rule my-4" />

      <dl className="num space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd>{rupiah(totals.subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Diskon</dt>
          <dd className="w-36">
            <MoneyInput aria-label="Diskon" value={discount} onChange={setDiscount} className="h-8" />
          </dd>
        </div>
        {totals.serviceCharge > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted">Service {settings?.servicePercent}%</dt>
            <dd>{rupiah(totals.serviceCharge)}</dd>
          </div>
        )}
        {totals.tax > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted">Pajak {settings?.taxPercent}%</dt>
            <dd>{rupiah(totals.tax)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between pt-2">
          <dt className="font-semibold">Total</dt>
          <dd className="text-3xl font-extrabold tracking-tight">{rupiah(totals.total)}</dd>
        </div>
      </dl>

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
        <Button variant="outline" size="lg" onClick={resetOrder} disabled={!cart.length} aria-label="Kosongkan pesanan">
          <Trash2 className="size-5" />
        </Button>
        <Button variant="pay" size="lg" disabled={!cart.length} onClick={() => setPayOpen(true)}>
          Bayar {cart.length > 0 && rupiah(totals.total)}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="lg:grid lg:h-screen lg:grid-cols-[1fr_400px]">
      {/* Daftar menu */}
      <section className="flex min-h-0 flex-col pb-24 lg:pb-0">
        <div className="space-y-3 border-b border-line bg-canvas/95 px-4 pt-5 pb-3 backdrop-blur sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              ref={searchRef}
              placeholder="Cari menu atau SKU"
              aria-label="Cari menu"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-9"
            />
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {[{ id: 'all' as const, name: 'Semua' }, ...categories].map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                aria-pressed={activeCat === c.id}
                className={cx(
                  'shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
                  activeCat === c.id ? 'border-leaf bg-leaf text-white' : 'border-line bg-surface text-ink hover:border-leaf',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {visibleProducts.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">
              Tidak ada menu yang cocok. Ubah kata kunci atau pilih kategori lain.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((p) => {
                const left = p.stock - qtyInCart(p.id);
                const soldOut = p.trackStock && left <= 0;
                const inCart = qtyInCart(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    disabled={soldOut}
                    className={cx(
                      'group relative flex min-h-28 flex-col justify-between rounded-xl border bg-surface p-3 text-left transition-colors',
                      inCart ? 'border-leaf ring-1 ring-leaf' : 'border-line hover:border-leaf',
                      soldOut && 'opacity-50',
                    )}
                  >
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="mb-2 aspect-[4/3] w-full rounded-lg object-cover" />
                    )}
                    <span className="text-sm font-semibold leading-snug">{p.name}</span>
                    <span className="mt-2 flex items-end justify-between gap-2">
                      <span className="num text-base font-extrabold text-leaf-dark">{number(p.price)}</span>
                      {p.trackStock &&
                        (soldOut ? (
                          <Badge tone="danger">Habis</Badge>
                        ) : left <= p.minStock ? (
                          <Badge tone="warn">Sisa {left}</Badge>
                        ) : null)}
                    </span>
                    {inCart > 0 && (
                      <span className="num absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-leaf text-xs font-bold text-white">
                        {inCart}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Tiket pesanan: desktop */}
      <aside className="hidden min-h-0 p-4 pl-0 lg:block">{ticket}</aside>

      {/* Tiket pesanan: mobile/tablet */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface p-3 lg:hidden">
        <Button variant="pay" size="lg" className="w-full justify-between" onClick={() => setCartOpenMobile(true)}>
          <span>Lihat pesanan ({itemCount})</span>
          <span className="num">{rupiah(totals.total)}</span>
        </Button>
      </div>
      {cartOpenMobile && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-ink/40 lg:hidden" onClick={() => setCartOpenMobile(false)}>
          <div className="h-[88vh] p-2" onClick={(e) => e.stopPropagation()}>
            {ticket}
          </div>
        </div>
      )}

      <NoteModal
        line={noteFor}
        onClose={() => setNoteFor(null)}
        onSave={(note) => {
          if (!noteFor) return;
          setCart((c) => c.map((l) => (l.key === noteFor.key ? { ...l, note } : l)));
          setNoteFor(null);
        }}
      />

      <PaymentModal
        open={payOpen}
        total={totals.total}
        onClose={() => setPayOpen(false)}
        onPay={async (paymentMethod, paidAmount) => {
          const order = await api<Order>('/orders', {
            method: 'POST',
            body: {
              orderType,
              tableNo: orderType === 'DINE_IN' ? tableNo : undefined,
              customerName: customerName || undefined,
              discount: totals.discount,
              paymentMethod,
              paidAmount: paymentMethod === 'CASH' ? paidAmount : undefined,
              items: cart.map((l) => ({ productId: l.product.id, qty: l.qty, note: l.note || undefined })),
            },
          });
          setPayOpen(false);
          setCompleted(order);
          resetOrder();
          catalogQ.reload();
        }}
      />

      <Modal open={!!completed} onClose={() => setCompleted(null)} title="Pembayaran berhasil" width="max-w-sm">
        {completed && (
          <div className="space-y-5 text-center">
            <p className="text-sm text-muted">{completed.invoiceNo}</p>
            {completed.paymentMethod === 'CASH' ? (
              <div>
                <p className="text-sm text-muted">Kembalian</p>
                <p className="num text-4xl font-extrabold tracking-tight text-leaf-dark">{rupiah(completed.changeAmount)}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted">Diterima lewat {paymentLabel[completed.paymentMethod]}</p>
                <p className="num text-4xl font-extrabold tracking-tight text-leaf-dark">{rupiah(completed.total)}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setPrinting(completed)}>
                Cetak struk
              </Button>
              <Button
                data-autofocus
                onClick={() => {
                  setCompleted(null);
                  searchRef.current?.focus();
                }}
              >
                Pesanan baru
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {printing && <PrintReceipt order={printing} settings={settings} onDone={() => setPrinting(null)} />}
    </div>
  );
}

/* ---------- Modal catatan item ---------- */
function NoteModal({ line, onClose, onSave }: { line: CartLine | null; onClose: () => void; onSave: (note: string) => void }) {
  const [note, setNote] = useState('');
  const presets = ['Less sugar', 'Tanpa es', 'Less ice', 'Extra shot', 'Pedas', 'Tidak pedas'];
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (line && line.key !== lastKey) {
    setLastKey(line.key);
    setNote(line.note);
  }

  return (
    <Modal
      open={!!line}
      onClose={onClose}
      title={`Catatan: ${line?.product.name ?? ''}`}
      width="max-w-sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={() => onSave(note.trim())}>Simpan catatan</Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(note.trim());
        }}
        className="space-y-3"
      >
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mis. less sugar, tanpa es" maxLength={255} />
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setNote((n) => (n ? `${n}, ${p}` : p))}
              className="rounded-full border border-line px-3 py-1 text-xs font-medium hover:border-leaf hover:text-leaf"
            >
              {p}
            </button>
          ))}
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Modal pembayaran ---------- */
function PaymentModal({
  open,
  total,
  onClose,
  onPay,
}: {
  open: boolean;
  total: number;
  onClose: () => void;
  onPay: (method: PaymentMethod, paidAmount: number) => Promise<void>;
}) {
  const toast = useToast();
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [paid, setPaid] = useState(0);
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMethod('CASH');
      setPaid(0);
    }
  }

  const change = paid - total;
  const valid = method !== 'CASH' || paid >= total;

  async function submit() {
    if (!valid) return;
    setSaving(true);
    try {
      await onPay(method, paid);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Pembayaran" width="max-w-md">
      <div className="space-y-5">
        <div className="rounded-xl bg-leaf-soft px-4 py-3 text-center">
          <p className="text-sm text-leaf-dark">Total tagihan</p>
          <p className="num text-3xl font-extrabold tracking-tight text-leaf-dark">{rupiah(total)}</p>
        </div>

        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Metode pembayaran">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={method === m}
              onClick={() => setMethod(m)}
              className={cx(
                'rounded-lg border py-2.5 text-sm font-semibold',
                method === m ? 'border-leaf bg-leaf text-white' : 'border-line hover:border-leaf',
              )}
            >
              {paymentLabel[m]}
            </button>
          ))}
        </div>

        {method === 'CASH' ? (
          <div className="space-y-3">
            <Field label="Uang diterima">
              <MoneyInput value={paid} onChange={setPaid} className="h-12 text-lg font-bold" />
            </Field>
            <div className="flex flex-wrap gap-2">
              {cashSuggestions(total).map((v) => (
                <button
                  key={v}
                  onClick={() => setPaid(v)}
                  className="num rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-leaf hover:text-leaf"
                >
                  {v === total ? 'Uang pas' : number(v)}
                </button>
              ))}
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-sm text-muted">Kembalian</span>
              <span className={cx('num text-2xl font-extrabold', change < 0 ? 'text-danger' : 'text-ink')}>
                {paid ? (change < 0 ? `Kurang ${rupiah(-change)}` : rupiah(change)) : '-'}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Pastikan pembayaran {paymentLabel[method]} sudah berhasil di mesin EDC atau aplikasi sebelum menyimpan.
          </p>
        )}

        <Button variant="pay" size="lg" className="w-full" disabled={!valid} loading={saving} onClick={submit}>
          Simpan pembayaran
        </Button>
      </div>
    </Modal>
  );
}

/* ---------- Belum buka shift ---------- */
function OpenShiftGate({ onOpened }: { onOpened: () => void }) {
  const toast = useToast();
  const [cash, setCash] = useState(0);
  const [saving, setSaving] = useState(false);

  async function open(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/shifts/open', { method: 'POST', body: { openingCash: cash } });
      toast('Shift dibuka');
      onOpened();
    } catch (err) {
      toast(errorMessage(err), 'error');
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <Card className="w-full max-w-sm p-6">
        <form onSubmit={open} className="space-y-4">
          <div>
            <h1 className="text-xl font-extrabold">Buka shift dulu</h1>
            <p className="mt-1 text-sm text-muted">
              Hitung uang di laci kasir sebelum mulai berjualan. Angka ini dipakai untuk mencocokkan kas saat tutup shift.
            </p>
          </div>
          <Field label="Modal awal di laci">
            <MoneyInput value={cash} onChange={setCash} autoFocus />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={saving}>
            Buka shift
          </Button>
        </form>
      </Card>
    </div>
  );
}
