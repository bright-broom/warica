'use client';
import type {
  HTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
  Ref,
} from 'react';
import { Info, TriangleAlert, type LucideIcon } from 'lucide-react';
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
import { Empty, EmptyMedia, EmptyContent } from './empty';

// Domain presets compose shadcn/ui; the base primitives own behavior and styling.
export const cx = cn;
const panelTones = {
  default: 'border-main/10 bg-sub',
  soft: 'border-accent/30 bg-accent/15',
  inverse: 'border-main bg-main text-sub',
};
export function Panel({
  tone = 'default',
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: keyof typeof panelTones }) {
  return (
    <Card
      {...props}
      className={cn(
        'block min-w-0 rounded-panel p-5 shadow-none sm:p-7',
        panelTones[tone],
        className,
      )}
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
    <CardHeader className="mb-5 flex min-h-8 flex-row items-center gap-3 p-0">
      <Icon className="size-[21px]" aria-hidden="true" />
      <CardTitle className="sr-only" role="heading" aria-level={2}>
        {title}
      </CardTitle>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </CardHeader>
  );
}
export function Badge({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <BadgePrimitive
      variant="secondary"
      {...props}
      className={cn(
        'gap-1.5 rounded-full border-0 bg-main/5 px-3 py-1.5 text-xs font-semibold tabular-nums',
        className,
      )}
    >
      {children}
    </BadgePrimitive>
  );
}
export function Avatar({ name }: { name: string }) {
  return (
    <AvatarPrimitive aria-hidden="true" className="size-9 shrink-0 ring-2 ring-sub">
      <AvatarFallback className="bg-accent/35 text-sm font-semibold text-main">
        {Array.from(name)[0] || '?'}
      </AvatarFallback>
    </AvatarPrimitive>
  );
}
const fieldStyle =
  'min-h-control min-w-0 rounded-control border-main/15 bg-sub px-4 py-3 text-base text-main shadow-none placeholder:text-muted-foreground hover:border-main/35 focus-visible:border-main focus-visible:ring-main/20 disabled:opacity-40';
const inputVariants = {
  default: '',
  amount:
    'h-20 border-main/10 bg-accent/10 pl-10 pr-3 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl',
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
    <FieldPrimitive className="min-w-0 gap-2">
      <FieldLabel
        htmlFor={id}
        title={label}
        className={Icon ? 'flex h-6 items-center text-muted-foreground' : 'sr-only'}
      >
        {Icon && <Icon size={18} aria-hidden="true" />}
        <span className="sr-only">{label}</span>
      </FieldLabel>
      {children}
    </FieldPrimitive>
  );
}
export function Notice({ children, alert = false }: { children: ReactNode; alert?: boolean }) {
  return (
    <Alert
      role={alert ? 'alert' : 'status'}
      className="grid-cols-[1.25rem_minmax(0,1fr)] gap-3 rounded-control border-main/20 bg-accent/15 p-4 text-main"
    >
      <TriangleAlert size={19} aria-hidden="true" />
      <AlertDescription className="block min-w-0 text-sm leading-6 text-main wrap-anywhere">
        {children}
      </AlertDescription>
    </Alert>
  );
}
export function Help({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Collapsible className="mt-3 text-xs leading-6 text-muted-foreground">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} title={label}>
          <Info className="size-[18px]" aria-hidden="true" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="py-2">{children}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}
export function EmptyState({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <Empty className="gap-4 rounded-panel px-0 py-10 text-sm leading-6 wrap-anywhere md:p-10">
      <EmptyMedia>
        <Icon size={32} className="text-muted-foreground" aria-hidden="true" />
      </EmptyMedia>
      <EmptyContent>{children}</EmptyContent>
    </Empty>
  );
}
export function ActionRow({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-3 pt-2">{children}</div>;
}
