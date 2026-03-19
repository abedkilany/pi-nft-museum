'use client';

import { useState } from 'react';
import { setPiAuthToken } from '@/lib/pi-auth-client';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const waitForPi = async (timeoutMs = 8000) => {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      if ((window as any).Pi) return (window as any).Pi;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return null;
  };

  const handleLogin = async () => {
    try {
      setLoading(true);

      const pi = await waitForPi();
      if (!pi) {
        alert('Pi SDK not loaded. Open the app inside Pi Browser and try again.');
        return;
      }

      const auth = await pi.authenticate(['username', 'payments']);
      if (!auth?.accessToken) {
        alert('Pi login did not return an access token.');
        return;
      }

      const response = await fetch('/api/auth/pi/login', {
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

      const target = payload?.user?.role === 'admin' || payload?.user?.role === 'superadmin'
        ? '/account'
        : '/account';

      window.location.href = target;
    } catch (error) {
      console.error('Pi login error:', error);
      alert('Error during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Login with Pi</h1>
      <button onClick={handleLogin} disabled={loading}>
        {loading ? 'Loading...' : 'Login'}
      </button>
    </div>
  );
}
