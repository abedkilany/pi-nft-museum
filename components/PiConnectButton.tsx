'use client';

import { ReactNode, useState } from 'react';
import { usePiAuth } from '@/components/auth/PiAuthProvider';

type Props = {
  className?: string;
  children?: ReactNode;
  redirectTo?: string;
};

export function PiConnectButton({ className = 'button primary', children, redirectTo }: Props) {
  const [loading, setLoading] = useState(false);
  const { ensureAuthenticated } = usePiAuth();

  async function handleConnect() {
    await fetch('/api/auth/pi/debug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-App-Request': 'pi-web',
      },
      body: JSON.stringify({ event: 'PI_CONNECT_BUTTON_CLICKED', meta: { redirectTo: redirectTo || null } }),
      cache: 'no-store',
    }).catch(() => null);

    if (loading) return;

    try {
      setLoading(true);
      const user = await ensureAuthenticated();
      if (!user) {
        await fetch('/api/auth/pi/debug', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-App-Request': 'pi-web',
          },
          body: JSON.stringify({ event: 'PI_CONNECT_BUTTON_NO_USER', level: 'warn' }),
          cache: 'no-store',
        }).catch(() => null);
        alert('Pi login failed. Check audit log/system log for PI_AUTH_* events.');
        return;
      }

      const target = redirectTo || ((user.role === 'admin' || user.role === 'superadmin') ? '/admin' : '/account');
      window.location.href = target;
    } catch (error) {
      await fetch('/api/auth/pi/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-App-Request': 'pi-web',
        },
        body: JSON.stringify({
          event: 'PI_CONNECT_BUTTON_ERROR',
          level: 'warn',
          meta: { message: error instanceof Error ? error.message : 'Unknown error' },
        }),
        cache: 'no-store',
      }).catch(() => null);
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
