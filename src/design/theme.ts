import type { CSSProperties } from 'react';

/** The only base colors in WARICA. Surface tones are derived from these roles; text colors remain unchanged. */
export const palette = {
  main: '#193B3A',
  sub: '#F4F8F7',
  accent: '#69DCCB',
} as const;

export const themeVariables = {
  '--brand-main': palette.main,
  '--brand-sub': palette.sub,
  '--brand-accent': palette.accent,
  '--brand-accent-mint': 'hsl(from var(--brand-accent) calc(h - 24) s l)',
  '--brand-accent-light': 'color-mix(in srgb, var(--brand-accent-mint) 48%, var(--brand-sub))',
  '--brand-accent-gradient':
    'linear-gradient(135deg, var(--brand-accent-light) 0%, var(--brand-accent-mint) 48%, var(--brand-accent) 100%)',
  '--brand-accent-soft':
    'linear-gradient(135deg, color-mix(in srgb, var(--brand-accent-light) 35%, var(--brand-sub)), color-mix(in srgb, var(--brand-accent-mint) 28%, var(--brand-sub)) 48%, color-mix(in srgb, var(--brand-accent) 28%, var(--brand-sub)))',
  '--brand-accent-faint':
    'linear-gradient(135deg, color-mix(in srgb, var(--brand-accent-light) 16%, var(--brand-sub)), color-mix(in srgb, var(--brand-accent-mint) 10%, var(--brand-sub)) 48%, color-mix(in srgb, var(--brand-accent) 10%, var(--brand-sub)))',
} as CSSProperties;
