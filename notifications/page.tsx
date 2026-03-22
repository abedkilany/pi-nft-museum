'use client';

import { useEffect, useState } from 'react';
import { NotificationsList } from '@/components/notifications/NotificationsList';
import { piApiFetch } from '@/lib/pi-auth-client';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await piApiFetch('/api/notifications', { method: 'GET', cache: 'no-store' }).catch(() => null);
      const payload = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;
      if (!response?.ok) {
        setError(payload?.error || 'Failed to load notifications.');
        setLoading(false);
        return;
      }
      setNotifications(Array.isArray(payload) ? payload : payload?.notifications || []);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div style={{ paddingTop: 30 }}><div className="card" style={{ padding: '24px' }}><p>Loading notifications…</p></div></div>;
  }

  if (error) {
    return <div style={{ paddingTop: 30 }}><div className="card" style={{ padding: '24px' }}><p>{error}</p></div></div>;
  }

  return (
    <div style={{ paddingTop: 30, display: 'grid', gap: 24 }}>
      <NotificationsList initialNotifications={notifications} />
    </div>
  );
}
