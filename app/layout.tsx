import './globals.css';
import type { Metadata } from 'next';
import { NavBar } from '@/components/NavBar';
import { PiScript } from '@/components/PiScript';

export const metadata: Metadata = {
  title: 'Pi NFT Museum',
  description: 'Pi NFT Museum platform for visitors, members, collectors, and future Pi community features.'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
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
