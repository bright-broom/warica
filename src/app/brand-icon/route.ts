import { palette } from '@/design/theme';

export function GET() {
  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="17" fill="${palette.accent}"/><path d="M19 16v11c0 10 26 9 26 20M19 47V36c0-10 26-9 26-20m-7 0h7v7m-7 24h7v-7" fill="none" stroke="${palette.main}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    {
      headers: { 'Content-Type': 'image/svg+xml' },
    },
  );
}
