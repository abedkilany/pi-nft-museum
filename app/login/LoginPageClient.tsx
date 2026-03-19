'use client';

import { useState } from 'react';

export default function LoginPageClient() {
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

      sessionStorage.setItem('pi_token', auth.accessToken);

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

      if (!response.ok) {
        const text = await response.text();
        console.error('Server login failed:', text);
        alert('Server login failed.');
        return;
      }

      window.location.href = '/admin';
    } catch (error) {
      console.error('Pi login error:', error);
      alert('Error during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 480, margin: '40px auto' }}>
      <div className="section-head compact">
        <div>
          <span className="section-kicker">Pi Sign In</span>
          <h1>Login with Pi</h1>
        </div>
        <p>Open this page in Pi Browser, then continue with Pi authentication.</p>
      </div>

      <div className="card-actions" style={{ marginTop: 16 }}>
        <button
          type="button"
          className="button primary"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Login with Pi'}
        </button>
      </div>
    </div>
  );
}