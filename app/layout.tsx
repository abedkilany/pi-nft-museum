import './globals.css';
import type { Metadata, Viewport } from 'next';
import { NavBar } from '@/components/NavBar';
import { PiScript } from '@/components/PiScript';
import { PiAuthProvider } from '@/components/auth/PiAuthProvider';

export const metadata: Metadata = {
  title: 'Pi NFT Museum',
  description: 'Pi NFT Museum platform for visitors, members, collectors, and future Pi community features.'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PiScript />
        <PiAuthProvider>
          <div className="page-shell">
            <NavBar />
            <main className="container">{children}</main>
          </div>
        </PiAuthProvider>
      </body>
    </html>
  );
}