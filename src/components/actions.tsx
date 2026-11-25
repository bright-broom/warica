'use client';
import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

/*
 * 操作部品は2種類だけ。
 * - ActionButton / ActionLink：文字付き。画面を進める・確定するなど、主な操作に使う
 * - IconAction：アイコンだけ。行ごとの編集・削除・コピーなど、繰り返し並ぶ操作に使う
 *   （label が読み上げ名とツールチップになる）
 */
const variants = { primary: 'default', secondary: 'outline', ghost: 'ghost' } as const;
type Variant = keyof typeof variants;
const disabledStyle = 'disabled:cursor-not-allowed disabled:opacity-40';

type IconProps = {
  label: string;
  icon: LucideIcon;
  className?: string;
  variant?: Variant;
};
export function IconAction({
  label,
  icon: Icon,
  className,
  variant = 'ghost',
  type = 'button',
  ...props
}: IconProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          {...props}
          type={type}
          variant={variants[variant]}
          size="icon"
          className={cn('aria-pressed:accent-soft', disabledStyle, className)}
          aria-label={label}
        >
          <Icon className="size-5" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}
type TextProps = {
  /** 見える文字。読み上げ名にもなる */
  children: ReactNode;
  icon?: LucideIcon;
  /** アイコンを文字の後ろに置く（「次へ →」） */
  trailingIcon?: boolean;
  className?: string;
  variant?: Variant;
};
function Content({ children, icon: Icon, trailingIcon }: TextProps) {
  const icon = Icon && <Icon className="size-[18px]" aria-hidden="true" />;
  return (
    <>
      {!trailingIcon && icon}
      <span>{children}</span>
      {trailingIcon && icon}
    </>
  );
}
const textStyle = 'h-12 gap-2 px-5 text-[0.9375rem]';

export function ActionButton({
  children,
  icon,
  trailingIcon,
  className,
  variant = 'secondary',
  type = 'button',
  ...props
}: TextProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return (
    <Button
      {...props}
      type={type}
      variant={variants[variant]}
      className={cn(textStyle, disabledStyle, className)}
    >
      <Content icon={icon} trailingIcon={trailingIcon}>
        {children}
      </Content>
    </Button>
  );
}

export function ActionLink({
  children,
  icon,
  trailingIcon,
  className,
  variant = 'secondary',
  href,
}: TextProps & { href: string }) {
  return (
    <Button asChild variant={variants[variant]} className={cn(textStyle, className)}>
      <Link href={href}>
        <Content icon={icon} trailingIcon={trailingIcon}>
          {children}
        </Content>
      </Link>
    </Button>
  );
}
