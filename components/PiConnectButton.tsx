
'use client';

import { useEffect, useState } from 'react';
import { authenticateWithPi, initializePi } from '@/lib/pi';

export function PiConnectButton() {
  const [status, setStatus] = useState('Browsing as Visitor');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ready = initializePi();
    setStatus(ready ? 'Pi SDK ready' : 'Pi SDK not detected');
  }, []);

  async function handleConnect() {
    try {
      setLoading(true);
      const auth = await authenticateWithPi();
      setStatus(`Connected: ${auth.user?.username || 'Pi user'}`);
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="nav-actions">
      <span className="pill">{status}</span>
      <button className="button primary" onClick={handleConnect} disabled={loading}>
        {loading ? 'Connecting...' : 'Connect with Pi'}
      </button>
    </div>
  );
}
