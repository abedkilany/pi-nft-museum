'use client';

import { ReactNode, useState } from 'react';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { beginClientTrace, buildObservabilityHeaders } from '@/lib/observability-client';

type Props = {
  className?: string;
  children?: ReactNode;
  redirectTo?: string;
};

export function PiConnectButton({ className = 'button primary', children, redirectTo }: Props) {
  const [loading, setLoading] = useState(false);
  const { ensureAuthenticated } = usePiAuth();

  async function handleConnect() {
    if (loading) return;

    try {
      setLoading(true);
      const traceId = beginClientTrace();
      const headers = buildObservabilityHeaders({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-App-Request': 'pi-web',
      }, traceId);

      await fetch('/api/auth/pi/debug', {
        method: 'POST',
        headers,
        body: JSON.stringify({ event: 'PI_CONNECT_BUTTON_CLICKED', meta: { redirectTo: redirectTo || null, traceId } }),
        cache: 'no-store',
      }).catch(() => null);

      const user = await ensureAuthenticated(traceId);
      if (!user) {
        await fetch('/api/auth/pi/debug', {
          method: 'POST',
          headers,
          body: JSON.stringify({ event: 'PI_CONNECT_BUTTON_NO_USER', level: 'warn', meta: { traceId } }),
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
        headers: buildObservabilityHeaders({
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-App-Request': 'pi-web',
        }),
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
