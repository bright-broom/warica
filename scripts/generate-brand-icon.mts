import { writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Split } from 'lucide-react';
import { palette } from '../src/design/theme';

// ヘッダーのロゴと同じ Lucide のアイコンから、ファビコンの SVG を作る。
// 静的に書き出すため、実行時のルートではなくビルド前にファイルとして置く。
const mark = renderToStaticMarkup(
  createElement(Split, {
    x: 12,
    y: 12,
    width: 40,
    height: 40,
    color: 'currentColor',
    strokeWidth: 2.2,
  }),
);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" color="${palette.main}"><rect width="64" height="64" rx="14" fill="${palette.accent}"/>${mark}</svg>\n`;
await writeFile(new URL('../public/brand-icon.svg', import.meta.url), svg);
