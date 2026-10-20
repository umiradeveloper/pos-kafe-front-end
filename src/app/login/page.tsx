'use client';

import { Coffee } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Field, Input } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const u = await login(username, password);
      router.replace(u.role === 'CASHIER' ? '/pos' : '/dashboard');
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_minmax(420px,520px)]">
      <section className="relative hidden overflow-hidden bg-leaf p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Coffee className="size-6" aria-hidden />
          POS Kafe
        </div>
        <div className="max-w-md">
          <p className="text-4xl font-extrabold leading-tight tracking-tight">
            Catat pesanan, terima pembayaran, dan tutup shift tanpa hitung manual.
          </p>
          <p className="mt-4 text-white/75">Stok berkurang sendiri setiap ada penjualan. Laporan siap saat kafe tutup.</p>
        </div>
        <svg aria-hidden className="absolute -right-24 -bottom-24 size-[420px] text-white/[0.06]" viewBox="0 0 100 100">
          <ellipse cx="50" cy="50" rx="30" ry="44" fill="currentColor" transform="rotate(-30 50 50)" />
          <path d="M35 20 C 55 45, 45 55, 65 80" stroke="#1f5e4f" strokeWidth="4" fill="none" />
        </svg>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Masuk</h1>
            <p className="mt-1 text-sm text-muted">Gunakan akun yang dibuat oleh pemilik atau admin.</p>
          </div>

          <Field label="Username">
            <Input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </Field>
          <Field label="Password">
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>

          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" loading={submitting}>
            Masuk
          </Button>
        </form>
      </section>
    </main>
  );
}
