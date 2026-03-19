'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authenticateWithPi, waitForPiSdk } from '@/lib/pi';
import { setPiAuthToken } from '@/lib/pi-auth-client';

type LoginState = 'checking-sdk' | 'ready' | 'authenticating' | 'signing-in' | 'confirming-session' | 'redirecting' | 'error';

const SESSION_CONFIRM_ATTEMPTS = 5;
const SESSION_CONFIRM_DELAYS_MS = [250, 500, 800, 1200, 1600];
const AUTH_COOKIE_NAME = 'pi_nft_auth';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function storeClientToken(token: string) {
  if (typeof window === 'undefined') return;

  setPiAuthToken(token);

  const maxAge = 60 * 60 * 12;
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; SameSite=None; Secure`;
}

function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('pi_auth_token');
}

async function confirmSession() {
  for (let attempt = 0; attempt < SESSION_CONFIRM_ATTEMPTS; attempt += 1) {
    const token = getStoredToken();

    const meResponse = await fetch(`/api/auth/me?ts=${Date.now()}-${attempt}`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
    });

    const meData = await meResponse.json().catch(() => null);
    if (meResponse.ok && meData?.user) {
      return { user: meData.user, token };
    }

    if (attempt < SESSION_CONFIRM_DELAYS_MS.length) {
      await sleep(SESSION_CONFIRM_DELAYS_MS[attempt]);
    }
  }

  return null;
}

function buildRedirectUrl(path: string, token: string | null) {
  const url = new URL(path, window.location.origin);
  if (token) url.searchParams.set('authToken', token);
  return url.toString();
}

export function PiLoginCard() {
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/account';
  const [message, setMessage] = useState('Checking Pi Browser connection...');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<LoginState>('checking-sdk');
  const autoStartedRef = useRef(false);

  const handleLogin = useCallback(async () => {
    try {
      setLoading(true);
      setState('authenticating');
      setMessage('Waiting for Pi approval...');
      const authResult = await authenticateWithPi(['username']);

      if (!authResult?.accessToken) {
        throw new Error('Pi login did not return an access token.');
      }

      setState('signing-in');
      setMessage('Signing you in...');
      const response = await fetch('/api/auth/pi/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accessToken: authResult.accessToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Pi login failed.');
      }

      if (data?.token && typeof data.token === 'string') {
        storeClientToken(data.token);
      }

      setState('confirming-session');
      setMessage('Confirming your session...');
      const confirmed = await confirmSession();

      if (!confirmed?.user) {
        throw new Error('Pi login succeeded, but the session was not confirmed yet. Please retry from the Pi Browser or the Pi Sandbox URL.');
      }

      const target = confirmed.user.role === 'admin' || confirmed.user.role === 'superadmin' ? '/admin' : nextUrl;
      setState('redirecting');
      setMessage('Connection successful. Redirecting...');
      window.location.assign(buildRedirectUrl(target, confirmed.token));
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Pi login failed.');
    } finally {
      setLoading(false);
    }
  }, [nextUrl]);

  useEffect(() => {
    let cancelled = false;

    async function detectSdk() {
      setState('checking-sdk');
      setMessage('Checking Pi Browser connection...');
      const sdkReady = await waitForPiSdk(12000, 300);
      if (cancelled) return;

      setReady(sdkReady);
      if (sdkReady) {
        setState('ready');
        setMessage('Pi SDK detected. Connecting automatically...');
        if (!autoStartedRef.current) {
          autoStartedRef.current = true;
          void handleLogin();
        }
        return;
      }

      setState('error');
      setMessage('Pi SDK not detected. Open the app from Pi Browser or the Pi Sandbox URL, then try again.');
    }

    void detectSdk();

    return () => {
      cancelled = true;
    };
  }, [handleLogin]);

  return (
    <div style={{ paddingTop: '30px' }}>
      <section className="card upload-form">
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Automatic Pi sign-in</span>
            <h1>Connecting with Pi</h1>
          </div>
          <p>The app connects with Pi automatically in Pi Browser. If you are using the Sandbox, you can also retry manually.</p>
        </div>

        <div className="card" style={{ padding: '16px', display: 'grid', gap: '10px', marginBottom: '18px' }}>
          <strong>How it works</strong>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            Your Pi account is verified with Pi first, then your app account is created or updated automatically.
          </p>
        </div>

        <div className="form-actions">
          <button className="button primary" type="button" onClick={() => void handleLogin()} disabled={!ready || loading}>
            {loading ? 'Connecting to Pi...' : 'Retry Pi connection'}
          </button>
          {message ? <p className="form-message">{message}</p> : null}
          <p className="form-message" style={{ color: 'var(--muted)' }}>
            State: {state}
          </p>
        </div>
      </section>
    </div>
  );
}
