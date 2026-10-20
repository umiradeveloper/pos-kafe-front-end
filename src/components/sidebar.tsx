'use client';

import {
  BarChart3,
  Boxes,
  Clock,
  Coffee,
  History,
  KeyRound,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Settings,
  Store,
  Tags,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { roleLabel } from '@/lib/format';
import { useToast } from './toast';
import { Button, Field, Input, Modal, cx } from './ui';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  manager?: boolean;
}

const groups: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: BarChart3, manager: true },
      { href: '/pos', label: 'Kasir', icon: Store },
      { href: '/orders', label: 'Transaksi', icon: ReceiptText },
      { href: '/shift', label: 'Shift saya', icon: Clock },
    ],
  },
  {
    title: 'Kelola',
    items: [
      { href: '/products', label: 'Produk', icon: Package, manager: true },
      { href: '/categories', label: 'Kategori', icon: Tags, manager: true },
      { href: '/stock', label: 'Stok', icon: Boxes, manager: true },
      { href: '/shifts', label: 'Riwayat shift', icon: History, manager: true },
      { href: '/users', label: 'Pengguna', icon: Users, manager: true },
      { href: '/settings', label: 'Pengaturan', icon: Settings, manager: true },
    ],
  },
];

export function Sidebar() {
  const { user, isManager, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {groups.map((g, i) => {
        const items = g.items.filter((it) => !it.manager || isManager);
        if (!items.length) return null;
        return (
          <div key={i} className="space-y-0.5">
            {g.title && <p className="px-3 pb-1 text-xs font-semibold text-white/50">{g.title}</p>}
            {items.map((it) => {
              const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-white text-leaf-dark' : 'text-white/80 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <Icon className="size-[18px]" />
                  {it.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 p-3">
      <div className="px-3 pb-2">
        <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
        <p className="text-xs text-white/60">{user ? roleLabel[user.role] : ''}</p>
      </div>
      <button
        onClick={() => setPwOpen(true)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
      >
        <KeyRound className="size-[18px]" /> Ubah password
      </button>
      <button
        onClick={logout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
      >
        <LogOut className="size-[18px]" /> Keluar
      </button>
    </div>
  );

  const brand = (
    <div className="flex h-14 items-center gap-2 px-6 text-base font-bold text-white">
      <Coffee className="size-5" aria-hidden /> POS Kafe
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-leaf lg:flex">
        {brand}
        {nav}
        {footer}
      </aside>

      {/* Mobile / tablet */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-leaf px-4 lg:hidden">
        <div className="flex items-center gap-2 font-bold text-white">
          <Coffee className="size-5" aria-hidden /> POS Kafe
        </div>
        <button onClick={() => setOpen(true)} className="rounded-md p-2 text-white" aria-label="Buka menu">
          <Menu className="size-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="flex h-full w-64 flex-col bg-leaf" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button onClick={() => setOpen(false)} className="rounded-md p-2 text-white" aria-label="Tutup menu">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </>
  );
}

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/auth/change-password', { method: 'POST', body: { currentPassword: current, newPassword: next } });
      toast('Password diubah');
      setCurrent('');
      setNext('');
      onClose();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ubah password" width="max-w-sm">
      <form onSubmit={save} className="space-y-4">
        <Field label="Password lama">
          <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </Field>
        <Field label="Password baru" hint="Minimal 6 karakter">
          <Input type="password" autoComplete="new-password" minLength={6} value={next} onChange={(e) => setNext(e.target.value)} required />
        </Field>
        <Button type="submit" className="w-full" loading={saving}>
          Simpan password
        </Button>
      </form>
    </Modal>
  );
}
