'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { piApiFetch } from '@/lib/pi-auth-client';

type AccessStatus = 'loading' | 'ready' | 'blocked';

type AccountSummaryPayload = {
  ok?: boolean;
  user?: {
    username?: string | null;
  } | null;
  error?: string;
};

async function readJsonSafe(response: Response | null) {
  if (!response) return null;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return null;
  }

  try {
    return (await response.json()) as AccountSummaryPayload;
  } catch {
    return null;
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<AccessStatus>('loading');
  const [message, setMessage] = useState('Opening your profile…');

  useEffect(() => {
    let cancelled = false;

    async function openProfile() {
      try {
        const response = await piApiFetch('/api/account/summary', {
          method: 'GET',
          cache: 'no-store',
        }).catch(() => null);

        if (cancelled) return;

        if (!response) {
          setStatus('blocked');
          setMessage('Unable to verify your session. Redirecting…');
          router.replace('/login');
          return;
        }

        const payload = await readJsonSafe(response);
        if (cancelled) return;

        if (response.status === 401) {
          setStatus('blocked');
          setMessage('Your session needs to be refreshed. Redirecting…');
          router.replace('/login');
          return;
        }

        const username = String(payload?.user?.username ?? '').trim();
        if (response.ok && payload?.ok === true && username) {
          setStatus('ready');
          router.replace(`/profile/${encodeURIComponent(username)}`);
          return;
        }

        setStatus('blocked');
        setMessage(payload?.error || 'Unable to open your profile. Redirecting…');
        router.replace('/account');
      } catch (error) {
        console.error('Profile access check failed:', error);
        if (cancelled) return;
        setStatus('blocked');
        setMessage('Something went wrong while opening your profile. Redirecting…');
        router.replace('/account');
      }
    }

    void openProfile();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return (
    <div className="page-stack">
      <section className="card surface-section">
        <p>{message}</p>
      </section>
    </div>
  );
}
