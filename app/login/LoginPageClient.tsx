'use client';

import { useState } from 'react';

export default function LoginPageClient() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const pi = (window as any).Pi;
      if (!pi) {
        alert('Pi SDK not available');
        return;
      }

      const scopes = ['username', 'payments'];
      const auth = await pi.authenticate(scopes);

      if (!auth?.accessToken) {
        alert('Login failed');
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
        console.error(text);
        alert('Server login failed');
        return;
      }

      window.location.href = '/admin';
    } catch (error) {
      console.error(error);
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
        <p>Use your Pi Browser account to continue.</p>
      </div>

      <div className="card-actions" style={{ marginTop: 16 }}>
        <button type="button" className="button primary" onClick={handleLogin} disabled={loading}>
          {loading ? 'Signing in...' : 'Login with Pi'}
        </button>
      </div>
    </div>
  );
}