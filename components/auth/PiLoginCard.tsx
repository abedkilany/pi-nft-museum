'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authenticateWithPi, waitForPiSdk } from '@/lib/pi';

type LoginState = 'checking-sdk' | 'ready' | 'authenticating' | 'signing-in' | 'redirecting' | 'error';

export function PiLoginCard() {
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/account';
  const [message, setMessage] = useState('Checking Pi Browser connection...');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<LoginState>('checking-sdk');

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
        setMessage('Pi SDK detected. You can connect with Pi now.');
        return;
      }

      setState('error');
      setMessage('Pi SDK not detected. Open the app from Pi Browser or the Pi Sandbox URL, then try again.');
    }

    void detectSdk();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin() {
    try {
      setLoading(true);
      setState('authenticating');
      setMessage('Waiting for Pi approval...');
      const authResult = await authenticateWithPi();

      if (!authResult?.accessToken) {
        throw new Error('Pi login did not return an access token.');
      }

      setState('signing-in');
      setMessage('Signing you in...');
      const response = await fetch('/api/auth/pi/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ accessToken: authResult.accessToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Pi login failed.');
      }

      const meResponse = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store'
      });
      const meData = await meResponse.json();

      if (!meResponse.ok || !meData?.user) {
        throw new Error('Pi login succeeded, but the local session was not confirmed. Please try again from the Sandbox URL.');
      }

      const target = meData.user.role === 'admin' || meData.user.role === 'superadmin' ? '/admin' : nextUrl;
      setState('redirecting');
      setMessage('Connection successful. Redirecting...');
      window.location.assign(target);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Pi login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ paddingTop: '30px' }}>
      <section className="card upload-form">
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Visitor mode by default</span>
            <h1>Connect with Pi</h1>
          </div>
          <p>Everyone can browse the marketplace as a Visitor. Connect with Pi only when you want your own account for publishing or trading.</p>
        </div>

        <div className="card" style={{ padding: '16px', display: 'grid', gap: '10px', marginBottom: '18px' }}>
          <strong>How it works</strong>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            First-time Pi sign-in creates your account automatically with the role <strong>Artist or Trader</strong>.
            Admin and Super Admin accounts are still assigned from your server settings.
          </p>
        </div>

        <div className="form-actions">
          <button className="button primary" type="button" onClick={handleLogin} disabled={!ready || loading}>
            {loading ? 'Connecting to Pi...' : 'Connect with Pi'}
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
