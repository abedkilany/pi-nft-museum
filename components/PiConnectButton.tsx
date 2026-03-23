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

      await fetch('/api/events', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          category: 'SYSTEM_FLOW',
          type: 'AUTH_POST_LOGIN',
          name: 'POST_AUTH_REDIRECT_START',
          eventKey: 'POST_AUTH_REDIRECT_START',
          status: 'STARTED',
          source: 'CLIENT',
          feature: 'auth',
          route: window.location.pathname,
          url: window.location.href,
          sessionId: window.sessionStorage.getItem('app_event_session_id'),
          traceId,
          correlationId: traceId,
          message: `Redirecting after Pi login to ${target}`,
          data: { target, role: user.role, userId: user.id }
        }),
        cache: 'no-store',
        keepalive: true,
      }).catch(() => null);

      window.location.assign(target);
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
