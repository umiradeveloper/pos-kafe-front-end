'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/toast';
import { Badge, Button, Card, Checkbox, Field, Input, Modal, PageHeader, Select, Spinner, Table } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { roleLabel } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import type { Role, User } from '@/lib/types';

export default function UsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const { data: users, loading, error, reload } = useLoad(() => api<User[]>('/users'));
  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'CASHIER' as Role, isActive: true });
  const [saving, setSaving] = useState(false);

  const roles: Role[] = me?.role === 'OWNER' ? ['OWNER', 'ADMIN', 'CASHIER'] : ['ADMIN', 'CASHIER'];

  function open(u: User | 'new') {
    setEditing(u);
    setForm(
      u === 'new'
        ? { name: '', username: '', password: '', role: 'CASHIER', isActive: true }
        : { name: u.name, username: u.username, password: '', role: u.role, isActive: u.isActive },
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing === 'new') {
        await api('/users', {
          method: 'POST',
          body: { name: form.name, username: form.username, password: form.password, role: form.role },
        });
        toast('Pengguna ditambahkan');
      } else if (editing) {
        await api(`/users/${editing.id}`, {
          method: 'PATCH',
          body: {
            name: form.name,
            role: form.role,
            isActive: form.isActive,
            ...(form.password ? { password: form.password } : {}),
          },
        });
        toast('Pengguna disimpan');
      }
      setEditing(null);
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  const isSelf = editing !== 'new' && editing?.id === me?.id;
  const ownerLocked = editing !== 'new' && editing?.role === 'OWNER' && me?.role !== 'OWNER';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Pengguna"
        description="Kasir hanya bisa membuka halaman Kasir, Transaksi, dan Shift. Admin dan Owner bisa mengelola semuanya."
        actions={
          <Button onClick={() => open('new')}>
            <Plus className="size-4" /> Tambah pengguna
          </Button>
        }
      />

      <Card>
        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="p-6 text-danger">{error}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold">
                    {u.name}
                    {u.id === me?.id && <span className="ml-2 text-xs font-normal text-muted">(Anda)</span>}
                  </td>
                  <td className="text-muted">{u.username}</td>
                  <td>{roleLabel[u.role]}</td>
                  <td>{u.isActive ? <Badge tone="leaf">Aktif</Badge> : <Badge>Nonaktif</Badge>}</td>
                  <td className="text-right">
                    <Button size="sm" variant="outline" onClick={() => open(u)} disabled={u.role === 'OWNER' && me?.role !== 'OWNER'}>
                      Ubah
                    </Button>
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
        title={editing === 'new' ? 'Tambah pengguna' : 'Ubah pengguna'}
        width="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button type="submit" form="user-form" loading={saving} disabled={ownerLocked}>
              {editing === 'new' ? 'Tambah pengguna' : 'Simpan perubahan'}
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={save} className="space-y-4">
          <Field label="Nama">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Username" hint={editing === 'new' ? 'Huruf kecil, angka, titik, atau garis bawah' : 'Username tidak bisa diubah'}>
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
              disabled={editing !== 'new'}
              required
              pattern="[a-z0-9_.]{3,50}"
            />
          </Field>
          <Field label={editing === 'new' ? 'Password' : 'Password baru'} hint={editing === 'new' ? 'Minimal 6 karakter' : 'Kosongkan jika tidak diubah'}>
            <Input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={6}
              required={editing === 'new'}
            />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} disabled={isSelf}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleLabel[r]}
                </option>
              ))}
            </Select>
          </Field>
          {editing !== 'new' && !isSelf && (
            <Checkbox label="Akun aktif (bisa login)" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          )}
        </form>
      </Modal>
    </div>
  );
}
