import type { Metadata, Viewport } from 'next';
import { WarikanProvider } from '@/state/warikan-store';
import { PaymentWorkspaceProvider } from '@/state/payment-workspace';
import { ApplicationUI } from '@/components/layout/ApplicationUI';
import { AppShell } from '@/components/layout/AppShell';
import { palette, themeVariables } from '@/design/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'WARICA — 立て替えから、誰が誰にいくら送るかを出す割り勘アプリ',
  description:
    '旅行や食事の立て替えを記録して、誰が誰にいくら送れば精算が終わるかを計算します。ログイン不要、データはブラウザの中だけに保存します。',
  applicationName: 'WARICA',
  icons: { icon: '/brand-icon.svg' },
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
        <ApplicationUI>
          <WarikanProvider>
            <PaymentWorkspaceProvider>
              <AppShell>{children}</AppShell>
            </PaymentWorkspaceProvider>
          </WarikanProvider>
        </ApplicationUI>
      </body>
    </html>
  );
}
