import './globals.css';
import type { Metadata, Viewport } from 'next';
import { NavBar } from '@/components/NavBar';
import { PiScript } from '@/components/PiScript';
import { PiAuthProvider } from '@/components/auth/PiAuthProvider';
import { ErrorMonitorClient } from '@/components/error/ErrorMonitorClient';
import { AppEventClient } from '@/components/analytics/AppEventClient';
import { Suspense } from 'react';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'),
  title: 'Pi NFT Museum',
  description: 'A curated Pi-powered NFT museum experience.',
  openGraph: {
    title: 'Pi NFT Museum',
    description: 'A curated Pi-powered NFT museum experience.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pi NFT Museum',
    description: 'A curated Pi-powered NFT museum experience.',
  },
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PiScript />
        <PiAuthProvider>
          <ErrorMonitorClient />
          <Suspense fallback={null}>
            <AppEventClient />
          </Suspense>
          <div className="page-shell">
            <NavBar />
            <main className="container">{children}</main>
          </div>
        </PiAuthProvider>
      </body>
    </html>
  );
}