'use client';

import { ReactNode, useState } from 'react';
import { usePiAuth } from '@/components/auth/PiAuthProvider';

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
      const user = await ensureAuthenticated();
      if (!user) {
        alert('Pi login failed. Please try again from Pi Browser.');
        return;
      }

      const target = redirectTo || ((user.role === 'admin' || user.role === 'superadmin') ? '/admin' : '/account');
      window.location.href = target;
    } catch (error) {
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
