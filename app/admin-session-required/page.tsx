import Link from 'next/link';
import { Suspense } from 'react';
import { AdminSessionBootstrap } from '@/components/admin/AdminSessionBootstrap';

export const dynamic = 'force-dynamic';

const REASONS: Record<string, { title: string; description: string }> = {
  secure_session_failed: {
    title: 'We could not secure the admin session on this device',
    description: 'The admin panel requires a secure session channel. This browser or device did not preserve the secure admin session after login.',
  },
  fallback_failed: {
    title: 'Fallback login could not be secured for the admin panel',
    description: 'Your browser did not keep the cookies needed for the normal session, and the fallback path also could not be completed safely.',
  },
  missing_handoff_grant: {
    title: 'The admin handoff did not complete',
    description: 'The secure handoff token was not available when opening the admin panel, so we stopped the request instead of continuing with an unsafe session.',
  },
  invalid_handoff_grant: {
    title: 'The admin handoff expired or became invalid',
    description: 'The temporary handoff used to open the admin panel could not be verified anymore, so the session was blocked.',
  },
  bridge_issue_failed: {
    title: 'The admin bridge session could not be created',
    description: 'We could not finish creating a secure admin session for this browser environment.',
  },
};

export default async function AdminSessionRequiredPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const reasonKey = typeof params.reason === 'string' ? params.reason : 'secure_session_failed';
  const reason = REASONS[reasonKey] ?? REASONS.secure_session_failed;

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', background: '#0b1020', color: '#f3f4f6' }}>
      <div style={{ width: '100%', maxWidth: '760px', background: 'rgba(17,24,39,0.94)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '20px', padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: '999px', background: 'rgba(245,158,11,0.14)', color: '#fcd34d', fontWeight: 700, marginBottom: '16px' }}>
          Secure admin session required
        </div>
        <h1 style={{ fontSize: '2rem', lineHeight: 1.2, margin: '0 0 12px' }}>{reason.title}</h1>
        <Suspense fallback={null}>
          <AdminSessionBootstrap />
        </Suspense>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: '#d1d5db', margin: '0 0 14px' }}>{reason.description}</p>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: '#d1d5db', margin: '0 0 24px' }}>
          This usually happens when the current browser does not reliably send the cookies needed for the protected admin session, and we were not able to complete the fallback securely.
        </p>
        <ul style={{ margin: '0 0 28px', paddingLeft: '20px', color: '#cbd5e1', lineHeight: 1.8 }}>
          <li>Try a different browser or device for the admin panel.</li>
          <li>You can still use the regular app features on this device.</li>
          <li>For admin access, use the environment that successfully preserves the secure session.</li>
        </ul>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '160px', padding: '12px 18px', borderRadius: '12px', background: '#2563eb', color: 'white', textDecoration: 'none', fontWeight: 700 }}>
            Back to home
          </Link>
          <Link href="/account" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '160px', padding: '12px 18px', borderRadius: '12px', background: 'rgba(148,163,184,0.14)', color: '#e5e7eb', textDecoration: 'none', fontWeight: 700, border: '1px solid rgba(148,163,184,0.22)' }}>
            Open account
          </Link>
        </div>
      </div>
    </main>
  );
}
