import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const errors = [];
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await inspect(path);
      continue;
    }
    if (!/\.(tsx?|css|svg)$/.test(path)) continue;
    const source = await readFile(path, 'utf8');
    const file = relative('.', path);
    if (
      file !== 'src/design/theme.ts' &&
      /#[\da-f]{3,8}\b|\b(?:rgb|hsl|oklch|oklab)\s*\(/i.test(source)
    ) {
      errors.push(`${file}: define base colors in src/design/theme.ts`);
    }
    if (
      /\b(?:bg|text|border|ring|outline|fill|stroke|divide|accent|decoration)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)\b/.test(
        source,
      )
    ) {
      errors.push(`${file}: use main, sub or accent color roles`);
    }
    if (file.startsWith('src/app/') && file.endsWith('/page.tsx')) {
      if (/\bAppShell\b|\bWarikanProvider\b|import\s.*\.css/.test(source)) {
        errors.push(`${file}: layout and theme belong to the root layout`);
      }
      if (/<(?:input|select|textarea|button)\b/.test(source)) {
        errors.push(`${file}: use the shared input and action components`);
      }
    }
  }
}
await inspect('src');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('Design system: shared palette, layout and page controls verified.');
