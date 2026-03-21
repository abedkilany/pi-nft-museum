'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { piApiFetch } from '../../lib/pi-auth-client';

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type PanelStyle = {
  top: number;
  right?: number;
  left?: number;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<PanelStyle>({ top: 76, right: 24 });

  async function load() {
    const response = await piApiFetch('/api/notifications?take=8', { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    setNotifications(payload.notifications || []);
    setUnreadCount(payload.unreadCount || 0);
  }

  useEffect(() => {
    setMounted(true);
    load();

    function handleResize() {
      setIsMobile(window.innerWidth <= 640);
    }

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();

    if (window.innerWidth <= 640) {
      setPanelStyle({
        top: Math.round(rect.bottom + 10),
        left: 12
      });
      return;
    }

    setPanelStyle({
      top: Math.round(rect.bottom + 8),
      right: Math.max(16, Math.round(window.innerWidth - rect.right))
    });
  }, [open, isMobile]);

  async function markAllAsRead() {
    const response = await piApiFetch('/api/notifications/mark-all-read', { method: 'POST' });
    if (!response.ok) return;
    setNotifications((items) => items.map((item: any) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  }

  async function markOneAsRead(id: number) {
    const response = await piApiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
    if (!response.ok) return;
    setNotifications((items) => items.map((item: any) => (item.id === id ? { ...item, isRead: true } : item)));
    setUnreadCount((count) => Math.max(0, count - 1));
  }

  async function deleteOne(id: number) {
    const response = await piApiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
    if (!response.ok) return;
    setNotifications((items) => items.filter((item: any) => item.id !== id));
  }

  async function clearRead() {
    const response = await piApiFetch('/api/notifications/clear-read', { method: 'POST' });
    if (!response.ok) return;
    setNotifications((items) => items.filter((item: any) => !item.isRead));
  }

  const panel = open ? (
    <div
      ref={panelRef}
      className="notification-popover card"
      style={{
        position: 'fixed',
        top: panelStyle.top,
        right: panelStyle.right,
        left: panelStyle.left,
        width: isMobile ? undefined : 360,
        maxWidth: isMobile ? undefined : 'calc(100vw - 24px)',
        padding: 12,
        zIndex: 2000
      }}
    >
      <div className="notification-head">
        <div>
          <strong>Notifications</strong>
          <div className="notification-subtitle">{unreadCount} unread</div>
        </div>

        <div className="notification-toolbar">
          <button className="button secondary" type="button" onClick={markAllAsRead}>
            Mark all as read
          </button>
          <button className="button secondary" type="button" onClick={clearRead}>
            Clear read
          </button>
        </div>
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <p className="notification-empty">No notifications yet.</p>
        ) : (
          notifications.map((item: any) => (
            <div
              key={item.id}
              className="card notification-item"
              style={{
                padding: 12,
                borderColor: item.isRead ? 'var(--line)' : 'rgba(221,176,79,0.4)',
                background: item.isRead ? undefined : 'rgba(221,176,79,0.08)'
              }}
            >
              <div>
                <strong>{item.title}</strong>
                <p className="notification-message">{item.message}</p>
              </div>

              <div className="notification-item-actions">
                {!item.isRead ? (
                  <button className="button secondary" type="button" onClick={() => markOneAsRead(item.id)}>
                    Mark as read
                  </button>
                ) : null}
                <button className="button secondary" type="button" onClick={() => deleteOne(item.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="notification-footer">
        <Link href="/notifications" className="button primary" onClick={() => setOpen(false)}>
          Open notifications
        </Link>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        className="button secondary nav-bell-button"
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{ position: 'relative', minWidth: 52 }}
        aria-label="Notifications"
        aria-expanded={open}
      >
        🔔
        {unreadCount > 0 ? (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        ) : null}
      </button>

      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
  );
}