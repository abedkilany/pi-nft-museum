
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function AdminDeviceRequiredPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', background: '#0b1020', color: '#f3f4f6' }}>
      <div style={{ width: '100%', maxWidth: '720px', background: 'rgba(17,24,39,0.92)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '20px', padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: '999px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontWeight: 700, marginBottom: '16px' }}>
          Secure admin access required
        </div>
        <h1 style={{ fontSize: '2rem', lineHeight: 1.2, margin: '0 0 12px' }}>This device is not allowed for the admin panel</h1>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: '#d1d5db', margin: '0 0 14px' }}>
          The admin area requires a browser environment that can maintain a secure server-trusted session.
          Your current device or browser could not meet that requirement, so admin access has been blocked for security reasons.
        </p>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: '#d1d5db', margin: '0 0 24px' }}>
          Please switch to a supported desktop browser or another device before opening the admin panel.
        </p>
        <ul style={{ margin: '0 0 28px', paddingLeft: '20px', color: '#cbd5e1', lineHeight: 1.8 }}>
          <li>Use a desktop browser such as Firefox or Chrome.</li>
          <li>Do not use iPhone or iOS in-app browser sessions for admin access.</li>
          <li>Return to the main app on this device if you only need non-admin features.</li>
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
