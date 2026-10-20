'use client';

import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/toast';
import { Button, Card, EmptyState, Input, PageHeader, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useLoad } from '@/lib/hooks';
import type { Category } from '@/lib/types';

export default function CategoriesPage() {
  const toast = useToast();
  const { data: categories, loading, error, reload } = useLoad(() => api<Category[]>('/categories'));
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState(0);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      await api('/categories', { method: 'POST', body: { name, sortOrder: categories?.length ?? 0 } });
      toast(`Kategori ${name} ditambahkan`);
      setName('');
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setAdding(false);
    }
  }

  async function saveEdit(id: number) {
    try {
      await api(`/categories/${id}`, { method: 'PATCH', body: { name: editName, sortOrder: editOrder } });
      setEditId(null);
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function remove(c: Category) {
    const count = c._count?.products ?? 0;
    const msg = count
      ? `Hapus kategori "${c.name}"? ${count} produk di dalamnya akan menjadi tanpa kategori.`
      : `Hapus kategori "${c.name}"?`;
    if (!confirm(msg)) return;
    try {
      await api(`/categories/${c.id}`, { method: 'DELETE' });
      toast('Kategori dihapus');
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PageHeader title="Kategori" description="Kelompok menu yang tampil sebagai tombol filter di kasir. Urutan kecil tampil lebih dulu." />

      <Card>
        <form onSubmit={add} className="flex gap-2 border-b border-line p-4">
          <Input placeholder="Nama kategori baru, mis. Kopi" aria-label="Nama kategori baru" value={name} onChange={(e) => setName(e.target.value)} required />
          <Button type="submit" loading={adding}>
            Tambah
          </Button>
        </form>

        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="p-6 text-danger">{error}</p>
        ) : !categories?.length ? (
          <EmptyState title="Belum ada kategori">Tambahkan kategori seperti Kopi, Non-Kopi, atau Makanan.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                {editId === c.id ? (
                  <form
                    className="flex flex-1 items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveEdit(c.id);
                    }}
                  >
                    <Input aria-label="Urutan" type="number" min={0} value={editOrder} onChange={(e) => setEditOrder(Number(e.target.value))} className="w-20" />
                    <Input aria-label="Nama kategori" value={editName} onChange={(e) => setEditName(e.target.value)} required autoFocus />
                    <Button type="submit" size="sm" aria-label="Simpan">
                      <Check className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)} aria-label="Batal">
                      <X className="size-4" />
                    </Button>
                  </form>
                ) : (
                  <>
                    <span className="num w-8 text-sm text-muted">{c.sortOrder}</span>
                    <span className="flex-1 font-semibold">{c.name}</span>
                    <span className="text-sm text-muted">{c._count?.products ?? 0} produk</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Ubah ${c.name}`}
                      onClick={() => {
                        setEditId(c.id);
                        setEditName(c.name);
                        setEditOrder(c.sortOrder);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(c)} aria-label={`Hapus ${c.name}`}>
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
