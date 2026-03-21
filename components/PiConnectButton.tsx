'use client';

import { ReactNode, useState } from 'react';
import { loginWithPiAccessToken } from '@/lib/pi-auth-client';
import { authenticateWithPi } from '@/lib/pi';

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

      const auth = await authenticateWithPi(['username', 'payments']);
      if (!auth?.accessToken) {
        alert('Pi login did not return an access token.');
        return;
      }

      const result = await loginWithPiAccessToken(auth.accessToken);

      if (!result.ok || !result.authenticated) {
        alert(result.reason || 'Server login failed.');
        return;
      }

      const role = String(result.user?.role || '').trim().toLowerCase();
      const target = redirectTo || (
        role === 'admin' || role === 'superadmin'
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
