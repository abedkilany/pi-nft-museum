'use client';

import { ReactNode, useState } from 'react';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { buildObservabilityHeaders, consumeOrCreateTraceId } from '@/lib/observability-client';
import { getPiAuthHeaders } from '@/lib/pi-auth-client';
import { isPiDebugEnabled } from '@/lib/debug-flags';

async function pushPiClientDebug(headers: HeadersInit, payload: Record<string, unknown>) {
  if (!isPiDebugEnabled) return;

  await fetch('/api/auth/pi/debug', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    cache: 'no-store',
  }).catch(() => null);
}

type Props = {
  className?: string;
  children?: ReactNode;
  redirectTo?: string;
};

export function PiConnectButton({ className = 'button primary', children, redirectTo }: Props) {
  const [loading, setLoading] = useState(false);
  const { ensureAuthenticated, error: authError } = usePiAuth();

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
      const traceId = consumeOrCreateTraceId();
      const headers = buildObservabilityHeaders({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-App-Request': 'pi-web',
      }, traceId);

      await pushPiClientDebug(headers, { event: 'PI_CONNECT_BUTTON_CLICKED', meta: { redirectTo: redirectTo || null, traceId } });

      await emitEvent(headers, traceId, 'PI_CONNECT_BUTTON_AUTH_ATTEMPT', 'STARTED', { attempt: 1, redirectTo: redirectTo || null });
      let user = await ensureAuthenticated(traceId);
      if (!user) {
        await pushPiClientDebug(headers, { event: 'PI_CONNECT_BUTTON_NO_USER', level: 'warn', meta: { traceId, attempt: 1 } });
        await emitEvent(headers, traceId, 'PI_CONNECT_BUTTON_RETRY_SCHEDULED', 'WARNING', { reason: 'NO_USER', attempt: 1, retryDelayMs: 900 });
        await wait(900);
        await pushPiClientDebug(headers, { event: 'PI_CONNECT_BUTTON_RETRYING_AFTER_NO_USER', meta: { traceId, attempt: 2 } });
        await emitEvent(headers, traceId, 'PI_CONNECT_BUTTON_AUTH_ATTEMPT', 'STARTED', { attempt: 2, redirectTo: redirectTo || null, retry: true });
        user = await ensureAuthenticated(traceId);
      }

      if (!user) {
        await pushPiClientDebug(headers, { event: 'PI_CONNECT_BUTTON_NO_USER_FINAL', level: 'warn', meta: { traceId, attempts: 2, authError: authError || null } });
        await emitEvent(headers, traceId, 'PI_CONNECT_BUTTON_AUTH_FAILED_NO_USER', 'FAILED', { attempts: 2, authError: authError || null });
        alert(authError || 'Pi login did not complete. Please wait a moment and try again.');
        return;
      }

      await emitEvent(headers, traceId, 'PI_CONNECT_BUTTON_AUTH_RESOLVED', 'SUCCESS', { userId: user.id, role: user.role });

      let target = redirectTo || ((user.role === 'admin' || user.role === 'superadmin') ? '/admin' : '/account');

      if (!redirectTo && (user.role === 'admin' || user.role === 'superadmin')) {
        const adminEntryResponse = await fetch('/api/auth/admin-entry', {
          method: 'POST',
          headers: getPiAuthHeaders(headers),
          cache: 'no-store',
          credentials: 'include',
        }).catch(() => null);
        const adminEntryPayload = adminEntryResponse ? await adminEntryResponse.json().catch(() => null) : null;
        if (adminEntryResponse?.ok && adminEntryPayload?.ok && adminEntryPayload?.url) {
          target = String(adminEntryPayload.url);
        }
      }

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
      await pushPiClientDebug(
        buildObservabilityHeaders({
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-App-Request': 'pi-web',
        }, consumeOrCreateTraceId()),
        {
          event: 'PI_CONNECT_BUTTON_ERROR',
          level: 'warn',
          meta: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      );
      console.error('Pi login error:', error);
      alert(error instanceof Error ? error.message : 'Error during login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" className={className} onClick={handleConnect} disabled={loading} data-track-event="PI_CONNECT_BUTTON_CLICKED" data-feature="auth" data-track-label="Connect with Pi">
      {loading ? 'Connecting...' : children || 'Connect with Pi'}
    </button>
  );
}
