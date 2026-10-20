const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');
const TOKEN_KEY = 'pos_token';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

type Query = Record<string, string | number | boolean | undefined | null>;

interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
}

/** Pemanggil API dengan token otomatis dan pesan error berbahasa Indonesia. */
export async function api<T>(path: string, { method = 'GET', body, query }: Options = {}): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Tidak bisa terhubung ke server. Periksa koneksi atau pastikan backend berjalan.', 0);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const raw = data?.message ?? res.statusText;
    const message = Array.isArray(raw) ? raw.join(', ') : String(raw);
    if (res.status === 401 && path !== '/auth/login') {
      tokenStore.clear();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Terjadi kesalahan');
