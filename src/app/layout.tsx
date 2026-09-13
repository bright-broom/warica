import type { Metadata, Viewport } from 'next';
import { WarikanProvider } from './useWarikanStore';
import './globals.css';

export const metadata: Metadata = {
  title: 'WARICA — 楽しい時間の、そのあとに。',
  description:
    '旅行も、食事も、いつもの集まりも。誰がいくら払ったかを記録して、みんなの割り勘をすっきり。登録不要の割り勘アプリ。',
  applicationName: 'WARICA',
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f7f8f5',
  colorScheme: 'light',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <WarikanProvider>{children}</WarikanProvider>
      </body>
    </html>
  );
}
