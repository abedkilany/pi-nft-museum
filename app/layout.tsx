import './globals.css';
import type { Metadata } from 'next';
import { NavBar } from '@/components/NavBar';
import { PiScript } from '@/components/PiScript';
import { purgeExpiredArchivedArtworks } from '@/lib/artwork-archive';

export const metadata: Metadata = {
  title: 'Pi NFT Museum',
  description: 'Pi NFT Museum platform for visitors, members, collectors, and future Pi community features.'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await purgeExpiredArchivedArtworks();
  return (
    <html lang="en">
      <body>
        <PiScript />
        <div className="page-shell">
          <NavBar />
          <main className="container">{children}</main>
        </div>
      </body>
    </html>
  );
}
