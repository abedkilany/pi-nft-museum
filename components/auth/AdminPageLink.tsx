'use client';

import type { ReactNode, MouseEvent } from 'react';
import { getPiAuthHeaders } from '@/lib/pi-auth-client';

type Props = {
  href?: string;
  className?: string;
  children: ReactNode;
};

export function AdminPageLink({ href = '/admin', className, children }: Props) {
  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    const response = await fetch('/api/auth/session-bridge', {
      method: 'POST',
      headers: getPiAuthHeaders({ Accept: 'application/json' }),
      cache: 'no-store',
    }).catch(() => null);

    if (!response?.ok) {
      window.location.assign('/login');
      return;
    }

    window.location.assign(href);
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
