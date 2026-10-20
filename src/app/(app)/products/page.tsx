'use client';

import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useToast } from '@/components/toast';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Input,
  Modal,
  MoneyInput,
  PageHeader,
  Select,
  Spinner,
  Table,
} from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { rupiah } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import type { Category, Product } from '@/lib/types';

interface FormState {
  name: string;
  sku: string;
  categoryId: string;
  price: number;
  cost: number;
  trackStock: boolean;
  stock: number;
  minStock: number;
  imageUrl: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  name: '',
  sku: '',
  categoryId: '',
  price: 0,
  cost: 0,
  trackStock: true,
  stock: 0,
  minStock: 5,
  imageUrl: '',
  isActive: true,
};

export default function ProductsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useLoad(() =>
    Promise.all([api<Product[]>('/products'), api<Category[]>('/categories')]),
  );
  const [products, categories] = data ?? [[], []];

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!catFilter || String(p.categoryId ?? '') === catFilter) &&
        (!q || p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)),
    );
  }, [products, search, catFilter]);

  function openForm(p: Product | 'new') {
    setEditing(p);
    setForm(
      p === 'new'
        ? { ...emptyForm, categoryId: catFilter }
        : {
            name: p.name,
            sku: p.sku ?? '',
            categoryId: p.categoryId ? String(p.categoryId) : '',
            price: p.price,
            cost: p.cost ?? 0,
            trackStock: p.trackStock,
            stock: p.stock,
            minStock: p.minStock,
            imageUrl: p.imageUrl ?? '',
            isActive: p.isActive,
          },
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = {
      name: form.name,
      sku: form.sku,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      price: form.price,
      cost: form.cost,
      trackStock: form.trackStock,
      minStock: form.minStock,
      imageUrl: form.imageUrl || null,
      isActive: form.isActive,
      ...(editing === 'new' ? { stock: form.stock } : {}),
    };
    try {
      if (editing === 'new') await api('/products', { method: 'POST', body });
      else if (editing) await api(`/products/${editing.id}`, { method: 'PATCH', body });
      toast(editing === 'new' ? 'Produk ditambahkan' : 'Produk disimpan');
      setEditing(null);
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Product) {
    if (!confirm(`Hapus produk "${p.name}"?`)) return;
    try {
      const res = await api<{ message: string }>(`/products/${p.id}`, { method: 'DELETE' });
      toast(res.message);
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Produk"
        description="Menu yang dijual di kasir. Stok diubah lewat halaman Stok agar tercatat riwayatnya."
        actions={
          <Button onClick={() => openForm('new')}>
            <Plus className="size-4" /> Tambah produk
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <div className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Cari nama atau SKU" aria-label="Cari produk" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select aria-label="Kategori" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="w-48">
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="p-6 text-danger">{error}</p>
        ) : filtered.length === 0 ? (
          <EmptyState title={products.length ? 'Tidak ada produk yang cocok' : 'Belum ada produk'}>
            {!products.length && 'Tambahkan menu pertama Anda agar bisa dijual di kasir.'}
          </EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Produk</th>
                <th>Kategori</th>
                <th className="text-right">Harga</th>
                <th className="text-right">HPP</th>
                <th className="text-right">Stok</th>
                <th>Status</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <p className="font-semibold">{p.name}</p>
                    {p.sku && <p className="text-xs text-muted">{p.sku}</p>}
                  </td>
                  <td className="text-muted">{p.category?.name ?? '-'}</td>
                  <td className="num text-right font-semibold">{rupiah(p.price)}</td>
                  <td className="num text-right text-muted">{rupiah(p.cost ?? 0)}</td>
                  <td className="num text-right">
                    {!p.trackStock ? (
                      <span className="text-muted">Tidak dihitung</span>
                    ) : p.stock <= p.minStock ? (
                      <Badge tone={p.stock <= 0 ? 'danger' : 'warn'}>{p.stock}</Badge>
                    ) : (
                      p.stock
                    )}
                  </td>
                  <td>{p.isActive ? <Badge tone="leaf">Dijual</Badge> : <Badge>Nonaktif</Badge>}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openForm(p)} aria-label={`Ubah ${p.name}`}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(p)} aria-label={`Hapus ${p.name}`}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Tambah produk' : 'Ubah produk'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button type="submit" form="product-form" loading={saving}>
              {editing === 'new' ? 'Tambah produk' : 'Simpan perubahan'}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama produk" className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} required maxLength={150} />
          </Field>
          <Field label="Kategori">
            <Select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              <option value="">Tanpa kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="SKU / kode" hint="Opsional, harus unik">
            <Input value={form.sku} onChange={(e) => set('sku', e.target.value)} maxLength={50} />
          </Field>
          <Field label="Harga jual">
            <MoneyInput value={form.price} onChange={(v) => set('price', v)} required />
          </Field>
          <Field label="HPP / modal" hint="Untuk menghitung laba kotor">
            <MoneyInput value={form.cost} onChange={(v) => set('cost', v)} />
          </Field>

          <div className="sm:col-span-2">
            <Checkbox label="Hitung stok produk ini" checked={form.trackStock} onChange={(e) => set('trackStock', e.target.checked)} />
          </div>
          {form.trackStock && (
            <>
              {editing === 'new' ? (
                <Field label="Stok awal">
                  <Input type="number" min={0} value={form.stock} onChange={(e) => set('stock', Number(e.target.value))} />
                </Field>
              ) : (
                <Field label="Stok saat ini" hint="Ubah lewat halaman Stok">
                  <Input value={form.stock} disabled />
                </Field>
              )}
              <Field label="Batas stok menipis">
                <Input type="number" min={0} value={form.minStock} onChange={(e) => set('minStock', Number(e.target.value))} />
              </Field>
            </>
          )}

          <Field label="URL gambar" hint="Opsional" className="sm:col-span-2">
            <Input type="url" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…" />
          </Field>
          <div className="sm:col-span-2">
            <Checkbox label="Tampilkan di kasir" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
