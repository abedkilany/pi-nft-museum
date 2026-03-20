'use client';

import Link from 'next/link';
import { useState } from 'react';
import { piApiFetch } from '../../lib/pi-auth-client';

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationsList({ initialNotifications }: { initialNotifications: NotificationItem[] }) {
  const [items, setItems] = useState(initialNotifications);

  async function markAllAsRead() {
    const response = await piApiFetch('/api/notifications/mark-all-read', { method: 'POST' });
    if (!response.ok) return;
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
  }

  async function markAsRead(id: number) {
    const response = await piApiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
    if (!response.ok) return;
    setItems((current) => current.map((item) => item.id === id ? { ...item, isRead: true } : item));
  }

  async function clearRead() {
    const response = await piApiFetch('/api/notifications/clear-read', { method: 'POST' });
    if (!response.ok) return;
    setItems((current) => current.filter((item) => !item.isRead));
  }

  async function deleteItem(id: number) {
    const response = await piApiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
    if (!response.ok) return;
    setItems((current) => current.filter((item) => item.id !== id));
  }

  const unreadCount = items.filter((item) => !item.isRead).length;

  return (
    <section className="card" style={{ padding: 24 }}>
      <div className="section-head compact">
        <div>
          <span className="section-kicker">Community alerts</span>
          <h2>Your notifications</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className="pill">{unreadCount} unread</span>
          <button className="button secondary" type="button" onClick={markAllAsRead}>Mark all as read</button>
          <button className="button secondary" type="button" onClick={clearRead}>Clear read</button>
        </div>
      </div>
      {items.length === 0 ? <p style={{ margin: 0, color: 'var(--muted)' }}>No notifications yet.</p> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((item) => (
            <div key={item.id} className="card" style={{ padding: 16, borderColor: item.isRead ? 'var(--line)' : 'rgba(221,176,79,0.4)', background: item.isRead ? undefined : 'rgba(221,176,79,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong>{item.title}</strong>
                  <p style={{ margin: '8px 0 0', color: 'var(--muted)', lineHeight: 1.7 }}>{item.message}</p>
                </div>
                <small style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{new Date(item.createdAt).toLocaleString()}</small>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                {!item.isRead ? <button className="button secondary" type="button" onClick={() => markAsRead(item.id)}>Mark as read</button> : null}
                {item.linkUrl ? <Link href={item.linkUrl} className="button secondary">Open</Link> : null}
                <button className="button secondary" type="button" onClick={() => deleteItem(item.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}