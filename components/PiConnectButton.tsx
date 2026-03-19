'use client';

import { ReactNode, useState } from 'react';
import { setPiAuthToken } from '@/lib/pi-auth-client';
import { authenticateWithPi } from '@/lib/pi';
import { piApiFetch } from '../lib/pi-auth-client';

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

      const response = await piApiFetch('/api/auth/pi/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          accessToken: auth.accessToken,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        alert(payload?.error || 'Server login failed.');
        return;
      }

      setPiAuthToken(auth.accessToken);

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