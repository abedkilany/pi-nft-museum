'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { piApiFetch } from '@/lib/pi-auth-client';

type BootstrapState = 'idle' | 'checking' | 'success' | 'failed';

export function AdminSessionBootstrap() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<BootstrapState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const returnTo = useMemo(() => {
    const raw = searchParams.get('returnTo') || '/admin';
    return raw.startsWith('/admin') ? raw : '/admin';
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setState('checking');
      setMessage('Trying to restore your admin session on this device...');

      const response = await piApiFetch('/api/admin/session-bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnTo }),
        cache: 'no-store',
      }).catch(() => null);

      const payload = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;

      if (response?.ok && payload?.ok) {
        setState('success');
        setMessage('Admin session restored. Redirecting...');
        router.replace(typeof payload.returnTo === 'string' ? payload.returnTo : returnTo);
        router.refresh();
        return;
      }

      setState('failed');
      setMessage(payload?.error || 'Could not restore the admin session on this device.');
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [returnTo, router]);

  return (
    <div style={{ display: 'grid', gap: '10px', marginBottom: '22px' }}>
      <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: '999px', background: state === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(37,99,235,0.14)', color: state === 'failed' ? '#fca5a5' : '#93c5fd', fontWeight: 700, width: 'fit-content' }}>
        {state === 'checking' ? 'Checking fallback session' : state === 'success' ? 'Session restored' : state === 'failed' ? 'Session restore failed' : 'Preparing secure session'}
      </div>
      <p style={{ margin: 0, color: '#dbeafe', lineHeight: 1.7 }}>{message || 'Preparing secure admin access...'}</p>
    </div>
  );
}
