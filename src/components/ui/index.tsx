import type {
  HTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from 'react';
import { Info, TriangleAlert, type LucideIcon } from 'lucide-react';

export const cx = (...values: (string | false | undefined)[]) => values.filter(Boolean).join(' ');

const panelTones = {
  default: 'border-main/10 bg-sub',
  soft: 'border-accent/30 bg-accent/15',
  inverse: 'border-main bg-main text-sub',
};

export function Panel({
  tone = 'default',
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  tone?: keyof typeof panelTones;
}) {
  return (
    <section
      {...props}
      className={cx('min-w-0 rounded-panel border p-5 sm:p-7', panelTones[tone], className)}
    />
  );
}

export function SectionHeader({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex min-h-8 items-center gap-3">
      <Icon size={21} aria-hidden="true" />
      <h2 className="sr-only">{title}</h2>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  );
}

export function Badge({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full bg-main/5 px-3 py-1.5 text-xs font-semibold tabular-nums',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/35 text-sm font-semibold ring-2 ring-sub"
    >
      {Array.from(name)[0] || '?'}
    </span>
  );
}

const fieldStyle =
  'min-h-control w-full min-w-0 rounded-control border border-main/15 bg-sub px-4 py-3 text-base text-main placeholder:text-main/50 transition-colors hover:border-main/35 focus:border-main focus:outline-2 focus:outline-offset-2 focus:outline-main disabled:opacity-40';

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldStyle, className)} />;
}
export function SelectInput({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(fieldStyle, 'pr-8', className)} />;
}
export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(fieldStyle, 'min-h-60 resize-y text-sm leading-7', className)}
    />
  );
}
export function Field({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <label
        htmlFor={id}
        title={label}
        className={Icon ? 'flex h-6 items-center text-main/65' : 'sr-only'}
      >
        {Icon && <Icon size={18} aria-hidden="true" />}
        <span className="sr-only">{label}</span>
      </label>
      {children}
    </div>
  );
}

export function Notice({ children, alert = false }: { children: ReactNode; alert?: boolean }) {
  return (
    <div
      role={alert ? 'alert' : 'status'}
      className="flex items-start gap-3 rounded-control border border-main/20 bg-accent/15 p-4 text-sm leading-6 wrap-anywhere"
    >
      <TriangleAlert size={19} className="mt-0.5" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Help({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group mt-3 text-xs leading-6 text-main/70">
      <summary
        aria-label={label}
        title={label}
        className="flex size-control list-none items-center justify-center rounded-control hover:bg-main/5 [&::-webkit-details-marker]:hidden"
      >
        <Info size={18} aria-hidden="true" />
      </summary>
      <p className="py-2">{children}</p>
    </details>
  );
}

export function EmptyState({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center text-sm leading-6 wrap-anywhere">
      <Icon size={32} className="text-main/50" aria-hidden="true" />
      {children}
    </div>
  );
}

export function ActionRow({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-3 pt-2">{children}</div>;
}
