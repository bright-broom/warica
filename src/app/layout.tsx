import type { Metadata, Viewport } from 'next';
import { WarikanProvider } from './useWarikanStore';
import { AppShell } from '@/components/AppShell';
import { palette, themeVariables } from '@/design/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'WARICA — 楽しい時間の、そのあとに。',
  description:
    '旅行も、食事も、いつもの集まりも。誰がいくら払ったかを記録して、みんなの割り勘をすっきり。登録不要の割り勘アプリ。',
  applicationName: 'WARICA',
  icons: { icon: '/brand-icon' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: palette.sub,
  colorScheme: 'light',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" style={themeVariables}>
      <body>
        <WarikanProvider>
          <AppShell>{children}</AppShell>
        </WarikanProvider>
      </body>
    </html>
  );
}
