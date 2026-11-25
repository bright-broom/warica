import type { CSSProperties } from 'react';

/**
 * WARICA の基本色はこの3色だけ。面・線・薄い強調色はすべてここから混色して作る。
 * main: 文字・線・主要操作 / sub: 紙面 / accent: 現在位置・選択中・合計などの強調
 */
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
