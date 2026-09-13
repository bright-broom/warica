import { palette } from '@/design/theme';
import brandMark from '@/design/brand-mark.json';

export function GET() {
  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" color="${palette.main}"><rect width="64" height="64" rx="17" fill="${palette.accent}"/>${brandMark.svg}</svg>`,
    { headers: { 'Content-Type': 'image/svg+xml' } },
  );
}
