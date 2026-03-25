import './globals.css';
import type { Metadata, Viewport } from 'next';
import { NavBar } from '@/components/NavBar';
import { AppShell } from '@/components/layout/AppShell';

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
        <AppShell nav={<NavBar />}>{children}</AppShell>
      </body>
    </html>
  );
}