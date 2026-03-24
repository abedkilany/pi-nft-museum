'use client';

import { ReactNode, useState } from 'react';
import { getPiAuthHeaders } from '@/lib/pi-auth-client';

type Props = {
  className?: string;
  children?: ReactNode;
};

export function AdminPageLink({ className = 'button secondary', children }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch('/api/auth/admin-entry', {
        method: 'POST',
        headers: getPiAuthHeaders({
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-App-Request': 'pi-web',
        }),
        cache: 'no-store',
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok || !payload?.url) {
        throw new Error(payload?.error || 'Unable to open admin panel.');
      }

      window.location.assign(payload.url as string);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to open admin panel.');
      setLoading(false);
    }
  }

  return (
    <button type="button" className={className} onClick={handleClick} disabled={loading}>
      {loading ? 'Opening…' : children || 'Admin panel'}
    </button>
  );
}
