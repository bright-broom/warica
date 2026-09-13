import type { CSSProperties } from 'react';

/** The only base colors in WARICA. All other tones are opacity variations. */
export const palette = {
  main: '#193B3A',
  sub: '#F4F8F7',
  accent: '#69DCCB',
} as const;

export const themeVariables = {
  '--brand-main': palette.main,
  '--brand-sub': palette.sub,
  '--brand-accent': palette.accent,
} as CSSProperties;
