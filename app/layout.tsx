import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { NavBar } from '@/components/NavBar';
import { PiScript } from '@/components/PiScript';
import AuthSessionBridge from '@/components/auth/AuthSessionBridge';
import { RouteAccessGate } from '@/components/auth/RouteAccessGate';
import { AuthApiFetchBridge } from '@/components/auth/AuthApiFetchBridge';

export const metadata: Metadata = {
  title: 'Pi NFT Museum',
  description: 'Pi NFT Museum platform for visitors, members, collectors, and future Pi community features.'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PiScript />
        <Suspense fallback={null}>
          <AuthSessionBridge />
        </Suspense>
        <Suspense fallback={null}>
          <RouteAccessGate />
        </Suspense>
        <AuthApiFetchBridge />
        <div className="page-shell">
          <NavBar />
          <main className="container">{children}</main>
        </div>
      </body>
    </html>
  );
}