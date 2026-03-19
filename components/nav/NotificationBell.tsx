'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<{ top: number; right: number }>({ top: 76, right: 24 });

  async function load() {
    const response = await fetch('/api/notifications?take=8', { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    setNotifications(payload.notifications || []);
    setUnreadCount(payload.unreadCount || 0);
  }

  useEffect(() => {
    setMounted(true);
    load();
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPanelStyle({ top: Math.round(rect.bottom + 8), right: Math.max(16, Math.round(window.innerWidth - rect.right)) });
  }, [open]);

  async function markAllAsRead() {
    const response = await fetch('/api/notifications/mark-all-read', { method: 'POST' });
    if (!response.ok) return;
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  }

  async function markOneAsRead(id: number) {
    const response = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    if (!response.ok) return;
    setNotifications((items) => items.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    setUnreadCount((count) => Math.max(0, count - 1));
  }

  async function deleteOne(id: number) {
    const response = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    if (!response.ok) return;
    setNotifications((items) => items.filter((item) => item.id !== id));
  }

  async function clearRead() {
    const response = await fetch('/api/notifications/clear-read', { method: 'POST' });
    if (!response.ok) return;
    setNotifications((items) => items.filter((item) => !item.isRead));
  }

  const panel = open ? (
    <div ref={panelRef} className="notification-popover card" style={{ position: 'fixed', top: panelStyle.top, right: panelStyle.right, width: 360, maxWidth: 'calc(100vw - 24px)', padding: 12, zIndex: 2000 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 8px 12px', borderBottom: '1px solid var(--line)', marginBottom: 10 }}>
        <div>
          <strong>Notifications</strong>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>{unreadCount} unread</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="button secondary" type="button" onClick={markAllAsRead}>Mark all as read</button>
          <button className="button secondary" type="button" onClick={clearRead}>Clear read</button>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
        {notifications.length === 0 ? <p style={{ margin: 8, color: 'var(--muted)' }}>No notifications yet.</p> : notifications.map((item) => (
          <div key={item.id} className="card" style={{ padding: 12, borderColor: item.isRead ? 'var(--line)' : 'rgba(221,176,79,0.4)', background: item.isRead ? undefined : 'rgba(221,176,79,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <strong>{item.title}</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)', lineHeight: 1.5 }}>{item.message}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {!item.isRead ? <button className="button secondary" type="button" onClick={() => markOneAsRead(item.id)}>Mark as read</button> : null}
              <button className="button secondary" type="button" onClick={() => deleteOne(item.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ paddingTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <Link href="/notifications" className="button primary" onClick={() => setOpen(false)}>Open notifications</Link>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button ref={buttonRef} className="button secondary" type="button" onClick={() => setOpen((value) => !value)} style={{ position: 'relative', minWidth: 52 }} aria-label="Notifications">
        🔔
        {unreadCount > 0 ? <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
  );
}
