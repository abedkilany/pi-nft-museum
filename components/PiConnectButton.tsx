'use client';

import { ReactNode, useState } from 'react';
import { ensurePiUserSession } from '@/lib/pi-auth-client';

type Props = {
  className?: string;
  children?: ReactNode;
  redirectTo?: string;
};

export function PiConnectButton({ className = 'button primary', children, redirectTo }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    if (loading) return;

    try {
      setLoading(true);
      const payload = await ensurePiUserSession(['username', 'payments']);
      const target = redirectTo || (
        payload?.user?.role === 'admin' || payload?.user?.role === 'superadmin'
          ? '/admin'
          : '/account'
      );
      window.location.href = target;
    } catch (error) {
      console.error('Pi login error:', error);
      alert(error instanceof Error ? error.message : 'Error during login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" className={className} onClick={handleConnect} disabled={loading}>
      {loading ? 'Connecting...' : children || 'Connect with Pi'}
    </button>
  );
}
