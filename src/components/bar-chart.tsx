'use client';

import { useState } from 'react';

interface Datum {
  label: string;
  /** Label lengkap untuk tooltip & tabel (mis. tanggal penuh) */
  fullLabel?: string;
  value: number;
  sub?: string;
}

const compact = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}jt` : n >= 1000 ? `${+(n / 1000).toFixed(0)}rb` : String(n);

/** Batas atas sumbu Y yang dibulatkan ke angka "bersih" */
function niceMax(max: number) {
  if (max <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(max));
  const f = max / exp;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return step * exp;
}

/**
 * Grafik kolom satu seri: batang ≤ 24px, ujung membulat 4px, grid tipis,
 * tooltip saat hover/fokus, dan tabel tersembunyi untuk pembaca layar.
 */
export function BarChart({
  data,
  format,
  title,
  height = 200,
  labelEvery = 1,
}: {
  data: Datum[];
  format: (n: number) => string;
  title: string;
  height?: number;
  labelEvery?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = [0, 0.5, 1].map((t) => t * max);

  return (
    <figure>
      <div className="relative flex" style={{ height }}>
        {/* Sumbu Y */}
        <div className="relative w-10 shrink-0 text-[11px] text-muted" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="num absolute right-2" style={{ bottom: `${(t / max) * 100}%`, transform: 'translateY(50%)' }}>
              {compact(t)}
            </span>
          ))}
        </div>

        {/* Area plot */}
        <div className="relative flex-1" aria-hidden>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-grid" style={{ bottom: `${(t / max) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d, i) => (
              <div
                key={i}
                className="relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div
                  className="w-full max-w-6 rounded-t-[4px] transition-opacity"
                  style={{
                    height: `${(d.value / max) * 100}%`,
                    minHeight: d.value > 0 ? 2 : 0,
                    background: 'var(--color-chart)',
                    opacity: hover === null || hover === i ? 1 : 0.45,
                  }}
                />
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-1 rounded-md bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg">
                    <p className="font-semibold">{d.fullLabel ?? d.label}</p>
                    <p className="num">{format(d.value)}</p>
                    {d.sub && <p className="text-white/70">{d.sub}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sumbu X */}
      <div className="ml-10 flex gap-[2px] pt-1.5 text-[11px] text-muted" aria-hidden>
        {data.map((d, i) => (
          <span key={i} className="flex-1 truncate text-center">
            {i % labelEvery === 0 ? d.label : ''}
          </span>
        ))}
      </div>

      {/* Versi tabel untuk pembaca layar */}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <th scope="row">{d.fullLabel ?? d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
