import Link from 'next/link';
import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from './ui';

const variants = {
  primary: 'border-main/5 bg-accent text-main hover:bg-accent/70',
  secondary: 'border-main/15 bg-sub text-main hover:bg-accent/20',
  ghost: 'border-transparent text-main/70 hover:bg-main/5 hover:text-main',
};
const sizes = { default: 'size-control', large: 'h-14 w-20' };

type IconProps = {
  label: string;
  icon: LucideIcon;
  className?: string;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};
const actionStyle = (
  variant: keyof typeof variants,
  size: keyof typeof sizes,
  className?: string,
) =>
  cx(
    'inline-flex shrink-0 items-center justify-center rounded-control border transition-colors disabled:cursor-not-allowed disabled:opacity-30',
    variants[variant],
    sizes[size],
    className,
  );

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
    <button
      {...props}
      type={type}
      className={actionStyle(variant, size, className)}
      aria-label={label}
      title={label}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
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
    <Link
      href={href}
      className={actionStyle(variant, size, className)}
      aria-label={label}
      title={label}
    >
      <Icon size={20} aria-hidden="true" />
    </Link>
  );
}
