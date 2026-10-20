'use client';

import { Loader2, X } from 'lucide-react';
import { cloneElement, forwardRef, useEffect, useId, useRef } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* ---------- Button ---------- */
type Variant = 'primary' | 'pay' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-leaf text-white hover:bg-leaf-dark',
  pay: 'bg-saffron text-ink hover:bg-saffron-dark',
  outline: 'border border-line bg-surface text-ink hover:border-leaf hover:text-leaf',
  ghost: 'text-ink hover:bg-leaf-soft',
  danger: 'bg-danger text-white hover:brightness-95',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm rounded-md gap-1.5',
  md: 'h-10 px-4 text-sm rounded-lg gap-2',
  lg: 'h-14 px-6 text-base rounded-xl gap-2',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

/* ---------- Form fields ---------- */
/** Lebar penuh kecuali className sudah menentukan lebar sendiri (mis. w-36) */
const widthOf = (className?: string) => (className && /(^|\s)(\w+:)?w-/.test(className) ? '' : 'w-full');
const fieldBase =
  'rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/70 focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/20 disabled:bg-canvas';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx(fieldBase, widthOf(className), 'h-10', className)} {...rest} />;
});

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(fieldBase, widthOf(className), 'h-10 pr-8', className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(fieldBase, 'w-full min-h-20 py-2', className)} {...rest} />;
}

/** Input angka Rupiah dengan pemisah ribuan */
export function MoneyInput({
  value,
  onChange,
  className,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">Rp</span>
      <input
        inputMode="numeric"
        className={cx(fieldBase, 'num h-10 w-full pl-9 text-right', className)}
        value={value ? new Intl.NumberFormat('id-ID').format(value) : ''}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
        placeholder="0"
        {...rest}
      />
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactElement<{ id?: string }>;
  className?: string;
}) {
  const id = useId();
  const forId = children.props.id ?? id;
  const child = children.props.id ? children : cloneElement(children, { id });
  return (
    <div className={cx('space-y-1.5', className)}>
      <label htmlFor={forId} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {child}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Checkbox({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 rounded border-line accent-leaf" {...rest} />
      {label}
    </label>
  );
}

/* ---------- Modal ---------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    const first = panelRef.current?.querySelector<HTMLElement>(
      '[data-autofocus], input:not([type=hidden]), select, textarea, button:not([data-close])',
    );
    first?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={cx('flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl', width)}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button data-close onClick={onClose} className="rounded-md p-1 text-muted hover:bg-canvas" aria-label="Tutup">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Misc ---------- */
type BadgeTone = 'neutral' | 'leaf' | 'danger' | 'warn';
const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-canvas text-muted',
  leaf: 'bg-leaf-soft text-leaf-dark',
  danger: 'bg-danger-soft text-danger',
  warn: 'bg-warn-soft text-[#8a5a00]',
};
export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', badgeTones[tone])}>
      {children}
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx('rounded-xl border border-line bg-surface', className)}>{children}</div>;
}

export function Spinner({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-muted [&_thead]:border-b [&_thead]:border-line [&_tbody_tr]:border-b [&_tbody_tr]:border-line/70 [&_tbody_tr:last-child]:border-0">
        {children}
      </table>
    </div>
  );
}

/** Pilihan tanggal dari–sampai */
export function DateRange({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input type="date" aria-label="Dari tanggal" value={from} max={to} onChange={(e) => onChange({ from: e.target.value, to })} className="w-40" />
      <span className="text-sm text-muted">s/d</span>
      <Input type="date" aria-label="Sampai tanggal" value={to} min={from} onChange={(e) => onChange({ from, to: e.target.value })} className="w-40" />
    </div>
  );
}

export { cx };
