'use client';
import type {
  HTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
  Ref,
} from 'react';
import { ChevronDown, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle } from './card';
import { Badge as BadgePrimitive } from './badge';
import { Avatar as AvatarPrimitive, AvatarFallback } from './avatar';
import { Input } from './input';
import { Textarea } from './textarea';
import { NativeSelect } from './native-select';
import { Field as FieldPrimitive, FieldLabel } from './field';
import { Alert, AlertDescription } from './alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';
import { Button } from './button';

// アプリ固有のプリセット。振る舞いは shadcn/ui の基礎部品が持ち、見た目の決まりをここに集める。
export const cx = cn;

const panelTones = {
  default: '',
  inverse: 'text-sub',
};
export function Panel({
  tone = 'default',
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: keyof typeof panelTones }) {
  return (
    <Card
      {...props}
      data-ui="panel"
      data-tone={tone}
      className={cn(
        'block min-w-0 rounded-panel p-4 shadow-none sm:p-6',
        panelTones[tone],
        className,
      )}
    />
  );
}

/** 画面の見出し。今どの段階で、何をする画面かを最初に伝える。 */
export function PageHeader({
  step,
  title,
  children,
}: {
  step?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-1.5 px-1 pt-1">
      {step && <p className="text-xs font-semibold text-muted-foreground">{step}</p>}
      <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">{title}</h1>
      {children && (
        <div className="max-w-prose text-sm leading-6 text-muted-foreground">{children}</div>
      )}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <CardHeader data-ui="section-header" className="mb-4 grid gap-1 p-0">
      <div className="flex min-h-8 items-center gap-2">
        <CardTitle className="text-base font-semibold" role="heading" aria-level={2}>
          {title}
        </CardTitle>
        <div className="ml-auto flex items-center gap-2">{children}</div>
      </div>
      {description && <p className="text-sm leading-6 text-muted-foreground">{description}</p>}
    </CardHeader>
  );
}

/** 件数などの補足。強調には使わない。 */
export function Badge({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <BadgePrimitive
      variant="secondary"
      {...props}
      data-ui="badge"
      className={cn(
        'gap-1.5 rounded-full border-0 bg-muted px-2.5 py-1 text-xs font-medium text-main tabular-nums',
        className,
      )}
    >
      {children}
    </BadgePrimitive>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <AvatarPrimitive aria-hidden="true" className="size-9 shrink-0">
      <AvatarFallback className="accent-soft text-sm font-semibold text-main">
        {Array.from(name)[0] || '?'}
      </AvatarFallback>
    </AvatarPrimitive>
  );
}

const fieldStyle =
  'min-h-control min-w-0 rounded-control px-4 py-3 text-base text-main shadow-none placeholder:text-muted-foreground focus-visible:ring-main/15 disabled:opacity-40';
const inputVariants = {
  default: '',
  amount: 'h-16 pl-10 pr-3 text-3xl font-semibold tracking-tight tabular-nums',
};
export function TextInput({
  className,
  variant = 'default',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  variant?: keyof typeof inputVariants;
  ref?: Ref<HTMLInputElement>;
}) {
  return <Input {...props} className={cn(fieldStyle, inputVariants[variant], className)} />;
}
export function SelectInput({
  className,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>) {
  return <NativeSelect {...props} className={cn(fieldStyle, 'pr-9', className)} />;
}
export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Textarea
      {...props}
      className={cn(fieldStyle, 'min-h-60 resize-y text-sm leading-7', className)}
    />
  );
}

/** 入力欄と見える見出しの組。hint は見出しの横に小さく出す（「任意」など）。 */
export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <FieldPrimitive className="min-w-0 gap-2">
      <FieldLabel htmlFor={id} className="flex items-baseline gap-2 text-sm font-semibold">
        {label}
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </FieldLabel>
      {children}
    </FieldPrimitive>
  );
}

/** 状態の知らせ。alert は操作の失敗など、すぐに読み上げるもの。 */
export function Notice({ children, alert = false }: { children: ReactNode; alert?: boolean }) {
  const Icon = alert ? TriangleAlert : Info;
  return (
    <Alert
      role={alert ? 'alert' : 'status'}
      data-tone={alert ? 'alert' : 'info'}
      className={cn(
        'grid-cols-[1.25rem_minmax(0,1fr)] gap-3 rounded-control p-4 text-main',
        alert ? 'border-main accent-faint' : 'border-border bg-muted',
      )}
    >
      <Icon size={19} aria-hidden="true" />
      <AlertDescription className="block min-w-0 text-sm leading-6 text-main wrap-anywhere">
        {children}
      </AlertDescription>
    </Alert>
  );
}

/** 補足の説明。見出しを押すと開く。 */
export function Help({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Collapsible className="mt-4 flex flex-col items-end text-sm leading-6 text-muted-foreground">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="group h-11 gap-1.5 px-3 text-sm font-medium text-muted-foreground"
        >
          <Info className="size-4" aria-hidden="true" />
          {label}
          <ChevronDown
            className="size-4 transition-transform group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="w-full">
        <div className="px-2 py-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** 何もない・進めない状態。理由と、次にすることを並べる。 */
export function EmptyState({
  icon: Icon,
  title,
  headingLevel = 2,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  headingLevel?: 1 | 2 | 3;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      data-ui="empty-state"
      className="flex flex-col items-start gap-3 rounded-panel border border-dashed border-input px-5 py-8 text-sm leading-6 wrap-anywhere sm:px-8"
    >
      <Icon size={28} className="text-muted-foreground" aria-hidden="true" />
      <Heading className="text-base font-semibold text-main">{title}</Heading>
      {children && <div className="max-w-prose text-muted-foreground">{children}</div>}
      {action && <div className="flex w-full flex-wrap justify-end gap-2 pt-1">{action}</div>}
    </div>
  );
}

/**
 * 画面の最後に置く「戻る」「次へ」の並び。主要な操作は右に置く。
 * スマホでは縦に積み、どの操作も親指の届く右側に寄せる。
 */
export function ActionRow({ children }: { children: ReactNode }) {
  return (
    <div className="ml-auto flex w-fit flex-col items-stretch gap-2 pt-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
      {children}
    </div>
  );
}
