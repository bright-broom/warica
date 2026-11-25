'use client';
import Link from 'next/link';
import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

const variants = { primary: 'default', secondary: 'outline', ghost: 'ghost' } as const;
type IconProps = {
  label: string;
  icon: LucideIcon;
  className?: string;
  variant?: keyof typeof variants;
  size?: 'default' | 'large';
};
const style =
  'border border-transparent aria-pressed:accent-soft aria-pressed:text-main disabled:cursor-not-allowed disabled:opacity-30';
export function IconAction({
  label,
  icon: Icon,
  className,
  variant = 'ghost',
  size = 'default',
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
          size={size === 'large' ? 'icon-lg' : 'icon'}
          className={cn(style, className)}
          aria-label={label}
        >
          <Icon className="size-5" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}
export function IconLink({
  label,
  icon: Icon,
  href,
  className,
  variant = 'ghost',
  size = 'default',
}: IconProps & { href: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          variant={variants[variant]}
          size={size === 'large' ? 'icon-lg' : 'icon'}
          className={cn(style, className)}
        >
          <Link href={href} aria-label={label}>
            <Icon className="size-5" aria-hidden="true" />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}
