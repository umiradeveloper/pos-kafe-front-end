'use client';

import { useEffect, useState } from 'react';
import { Receipt } from '@/components/receipt';
import { useToast } from '@/components/toast';
import { Button, Card, Field, Input, PageHeader, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { calcTotals } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import type { Order, Settings } from '@/lib/types';

export default function SettingsPage() {
  const toast = useToast();
  const { data, loading, setData } = useLoad(() => api<Settings>('/settings'));
  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (loading || !form) return <Spinner />;

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const updated = await api<Settings>('/settings', {
        method: 'PATCH',
        body: {
          storeName: form.storeName,
          address: form.address ?? '',
          phone: form.phone ?? '',
          taxPercent: Number(form.taxPercent),
          servicePercent: Number(form.servicePercent),
          receiptFooter: form.receiptFooter ?? '',
        },
      });
      setData(updated);
      toast('Pengaturan disimpan');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  // Contoh struk untuk pratinjau
  const t = calcTotals(53000, 0, form.servicePercent, form.taxPercent);
  const sample: Order = {
    id: 0,
    invoiceNo: 'INV-CONTOH-0001',
    shiftId: 0,
    user: { id: 0, name: 'Kasir 1' },
    orderType: 'DINE_IN',
    tableNo: '5',
    customerName: null,
    ...t,
    paymentMethod: 'CASH',
    paidAmount: Math.ceil(t.total / 10000) * 10000,
    changeAmount: Math.ceil(t.total / 10000) * 10000 - t.total,
    status: 'PAID',
    note: null,
    voidReason: null,
    voidedAt: null,
    createdAt: new Date().toISOString(),
    items: [
      { id: 1, productId: 1, productName: 'Kopi Susu Gula Aren', price: 25000, qty: 1, note: 'Less sugar', subtotal: 25000 },
      { id: 2, productId: 2, productName: 'Cappuccino', price: 28000, qty: 1, note: null, subtotal: 28000 },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader title="Pengaturan" description="Informasi toko di struk serta tarif pajak dan service charge." />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-6">
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama toko" className="sm:col-span-2">
              <Input value={form.storeName} onChange={(e) => set('storeName', e.target.value)} required maxLength={100} />
            </Field>
            <Field label="Alamat" className="sm:col-span-2">
              <Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} maxLength={255} />
            </Field>
            <Field label="Telepon">
              <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} maxLength={30} />
            </Field>
            <div />
            <Field label="Pajak (%)" hint="Mis. PB1 10% untuk restoran. Isi 0 jika tidak dipungut.">
              <Input type="number" min={0} max={100} step="0.01" value={form.taxPercent} onChange={(e) => set('taxPercent', Number(e.target.value))} />
            </Field>
            <Field label="Service charge (%)" hint="Dihitung sebelum pajak">
              <Input type="number" min={0} max={100} step="0.01" value={form.servicePercent} onChange={(e) => set('servicePercent', Number(e.target.value))} />
            </Field>
            <Field label="Pesan di bawah struk" className="sm:col-span-2">
              <Input value={form.receiptFooter ?? ''} onChange={(e) => set('receiptFooter', e.target.value)} maxLength={255} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" loading={saving}>
                Simpan pengaturan
              </Button>
            </div>
          </form>
        </Card>

        <div>
          <p className="mb-2 text-sm font-semibold text-muted">Pratinjau struk</p>
          <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
            <Receipt order={sample} settings={form} />
          </div>
        </div>
      </div>
    </div>
  );
}
