'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { piApiFetch } from '../../lib/pi-auth-client';

const OPTIONS = [
  { value: 'ALL', label: 'All activity' },
  { value: 'ARTWORKS', label: 'New artworks' },
  { value: 'PREMIUM', label: 'Premium artworks' },
  { value: 'COMMENTS', label: 'Comments' },
  { value: 'MUTE', label: 'Mute' },
] as const;

type Props = {
  targetUserId: number;
  initiallyFollowing: boolean;
  initialNotifyMode: string;
  initialFollowers: number;
};

export function ProfileFollowControls({ targetUserId, initiallyFollowing, initialNotifyMode, initialFollowers }: Props) {
  const [following, setFollowing] = useState(initiallyFollowing);
  const [notifyMode, setNotifyMode] = useState(initialNotifyMode || 'ALL');
  const [followers, setFollowers] = useState(initialFollowers);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const bellRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelStyle, setPanelStyle] = useState({ top: 160, left: 0 });

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as Node;
      if (bellRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (!open || !bellRef.current) return;
    const rect = bellRef.current.getBoundingClientRect();
    setPanelStyle({ top: Math.round(rect.bottom + 8), left: Math.round(rect.right - 240) });
  }, [open]);

  async function toggleFollow() {
    const response = await piApiFetch('/api/follows/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    });
    if (!response.ok) return;
    const payload = await response.json();
    setFollowing(payload.following);
    setNotifyMode(payload.notifyMode || 'ALL');
    setFollowers((value) => value + (payload.following ? 1 : -1));
    if (!payload.following) setOpen(false);
  }

  async function changeMode(value: string) {
    const response = await piApiFetch('/api/follows/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, notifyMode: value }),
    });
    if (!response.ok) return;
    setNotifyMode(value);
  }

  const menu = open && following ? (
    <div ref={panelRef} className="card" style={{ position: 'fixed', top: panelStyle.top, left: panelStyle.left, width: 240, padding: 12, zIndex: 2000 }}>
      <strong style={{ display: 'block', marginBottom: 10 }}>Follow alerts</strong>
      <div style={{ display: 'grid', gap: 8 }}>
        {OPTIONS.map((option: any) => (
          <button key={option.value} type="button" className="button secondary" onClick={() => changeMode(option.value)} style={{ justifyContent: 'space-between', borderColor: notifyMode === option.value ? 'rgba(221,176,79,0.4)' : undefined }}>
            <span>{option.label}</span>
            <span>{notifyMode === option.value ? '✓' : ''}</span>
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className={following ? 'button secondary' : 'button primary'} type="button" onClick={toggleFollow}>{following ? 'Following' : 'Follow'}</button>
        <button ref={bellRef} className="button secondary" type="button" onClick={() => following && setOpen((value) => !value)} title={following ? 'Follow alerts' : 'Follow first'} disabled={!following}>🔔</button>
        <span className="pill">{followers} follower{followers === 1 ? '' : 's'}</span>
      </div>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </>
  );
}