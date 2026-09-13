import Link from 'next/link';
import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

type IconProps = { label: string; icon: LucideIcon; className?: string };

export function IconAction({
  label,
  icon: Icon,
  className = '',
  type = 'button',
  ...props
}: IconProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return (
    <button
      {...props}
      type={type}
      className={`icon-action ${className}`}
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
  className = '',
}: IconProps & { href: string }) {
  return (
    <Link href={href} className={`icon-action ${className}`} aria-label={label} title={label}>
      <Icon size={20} aria-hidden="true" />
    </Link>
  );
}
