import './globals.css';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/app-shell';
import { SCRIPT_TEMA } from '@/lib/tema';

export const metadata: Metadata = {
  title: 'Fazenda',
  description: 'Gestão de fazenda de gado: rebanho, alimentação e financeiro.',
  // PWA: o manifesto vem de src/app/manifest.ts; estes são os complementos para iPhone/iPad.
  appleWebApp: { capable: true, title: 'Fazenda', statusBarStyle: 'default' },
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: o script abaixo põe a classe `dark` no <html> antes do React assumir.
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script id="tema" dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
