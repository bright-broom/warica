import { writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Split } from 'lucide-react';

// Generate from the same Lucide component used by the wordmark, outside Next's RSC runtime.
const svg = renderToStaticMarkup(
  createElement(Split, {
    x: 12,
    y: 12,
    width: 40,
    height: 40,
    color: 'currentColor',
    strokeWidth: 2.2,
  }),
);
await writeFile(
  new URL('../src/design/brand-mark.json', import.meta.url),
  JSON.stringify({ svg }, null, 2) + '\n',
);
