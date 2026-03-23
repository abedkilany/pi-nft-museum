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

  async function wait(ms: number) {
    await new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function emitEvent(headers: HeadersInit, traceId: string, name: string, status: 'STARTED' | 'SUCCESS' | 'WARNING' | 'FAILED', data?: Record<string, unknown>) {
    await fetch('/api/events', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        category: 'SYSTEM_FLOW',
        type: 'AUTH_POST_LOGIN',
        name,
        eventKey: name,
        status,
        source: 'CLIENT',
        feature: 'auth',
        route: window.location.pathname,
        url: window.location.href,
        sessionId: window.sessionStorage.getItem('app_event_session_id'),
        traceId,
        correlationId: traceId,
        isHealthy: status === 'SUCCESS' || status === 'STARTED',
        data: data || null,
      }),
      cache: 'no-store',
      keepalive: true,
    }).catch(() => null);
  }

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

      await emitEvent(headers, traceId, 'PI_CONNECT_BUTTON_AUTH_ATTEMPT', 'STARTED', { attempt: 1, redirectTo: redirectTo || null });
      let user = await ensureAuthenticated(traceId);
      if (!user) {
        await fetch('/api/auth/pi/debug', {
          method: 'POST',
          headers,
          body: JSON.stringify({ event: 'PI_CONNECT_BUTTON_NO_USER', level: 'warn', meta: { traceId, attempt: 1 } }),
          cache: 'no-store',
        }).catch(() => null);
        await emitEvent(headers, traceId, 'PI_CONNECT_BUTTON_RETRY_SCHEDULED', 'WARNING', { reason: 'NO_USER', attempt: 1, retryDelayMs: 900 });
        await wait(900);
        await fetch('/api/auth/pi/debug', {
          method: 'POST',
          headers,
          body: JSON.stringify({ event: 'PI_CONNECT_BUTTON_RETRYING_AFTER_NO_USER', meta: { traceId, attempt: 2 } }),
          cache: 'no-store',
        }).catch(() => null);
        await emitEvent(headers, traceId, 'PI_CONNECT_BUTTON_AUTH_ATTEMPT', 'STARTED', { attempt: 2, redirectTo: redirectTo || null, retry: true });
        user = await ensureAuthenticated(traceId);
      }

      if (!user) {
        await fetch('/api/auth/pi/debug', {
          method: 'POST',
          headers,
          body: JSON.stringify({ event: 'PI_CONNECT_BUTTON_NO_USER_FINAL', level: 'warn', meta: { traceId, attempts: 2 } }),
          cache: 'no-store',
        }).catch(() => null);
        await emitEvent(headers, traceId, 'PI_CONNECT_BUTTON_AUTH_FAILED_NO_USER', 'FAILED', { attempts: 2 });
        alert('Pi Browser did not return your Pi user yet. Please wait a moment and try again.');
        return;
      }

      await emitEvent(headers, traceId, 'PI_CONNECT_BUTTON_AUTH_RESOLVED', 'SUCCESS', { userId: user.id, role: user.role });

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
