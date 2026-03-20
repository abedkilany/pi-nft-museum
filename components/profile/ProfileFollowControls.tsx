'use client';

import { useMemo, useState } from 'react';
import { piApiFetch } from '../../lib/pi-auth-client';

type FollowState = {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
  preferences: {
    notificationsEnabled: boolean;
    notifyAllActivity: boolean;
    notifyNewArtworks: boolean;
    notifyPremiumArtworks: boolean;
    notifyComments: boolean;
    muted: boolean;
  } | null;
};

export function ProfileFollowControls({
  profileUserId,
  initial,
}: {
  profileUserId: number;
  initial: FollowState;
}) {
  const [state, setState] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState('');

  const bellDisabled = useMemo(() => !state.isFollowing, [state.isFollowing]);

  async function toggleFollow() {
    setSaving(true);
    setError('');
    try {
      const method = state.isFollowing ? 'DELETE' : 'POST';
      const response = await piApiFetch('/api/profile/follow', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileUserId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? 'Please log in with Pi to follow this profile.' : payload.error || 'Request failed');
      setState(payload.state);
      if (method === 'DELETE') setMenuOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update follow state.');
    } finally {
      setSaving(false);
    }
  }

  async function savePreferences(nextPrefs: NonNullable<FollowState['preferences']>) {
    setSaving(true);
    setError('');
    try {
      const response = await piApiFetch('/api/profile/follow/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileUserId, ...nextPrefs }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? 'Please log in with Pi to manage follow notifications.' : payload.error || 'Unable to save notification preferences.');
      setState((current) => ({ ...current, preferences: payload.preferences }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save preferences.');
    } finally {
      setSaving(false);
    }
  }

  const preferences = state.preferences || {
    notificationsEnabled: true,
    notifyAllActivity: true,
    notifyNewArtworks: true,
    notifyPremiumArtworks: true,
    notifyComments: true,
    muted: false,
  };

  return (
    <div className="follow-controls-wrap">
      <div className="follow-controls-row">
        <button className={`button ${state.isFollowing ? 'secondary' : 'primary'}`} type="button" onClick={toggleFollow} disabled={saving}>
          {state.isFollowing ? 'Following' : 'Follow'}
        </button>
        <div style={{ position: 'relative' }}>
          <button className="button secondary" type="button" disabled={bellDisabled || saving} onClick={() => setMenuOpen((value) => !value)} title="Follower notification settings">
            🔔
          </button>
          {menuOpen && !bellDisabled ? (
            <div className="card follow-popover">
              <strong style={{ display: 'block', marginBottom: 10 }}>Follow notifications</strong>
              <div style={{ display: 'grid', gap: 10 }}>
                <label className="inline-check"><input type="checkbox" checked={preferences.muted} onChange={(e) => savePreferences({ ...preferences, muted: e.target.checked, notificationsEnabled: !e.target.checked })} />Mute everything</label>
                <label className="inline-check"><input type="checkbox" checked={preferences.notifyAllActivity} onChange={(e) => savePreferences({ ...preferences, notifyAllActivity: e.target.checked, notificationsEnabled: true, muted: false })} />All activity</label>
                <label className="inline-check"><input type="checkbox" checked={preferences.notifyNewArtworks} onChange={(e) => savePreferences({ ...preferences, notifyNewArtworks: e.target.checked, notificationsEnabled: true, muted: false })} />New artworks</label>
                <label className="inline-check"><input type="checkbox" checked={preferences.notifyPremiumArtworks} onChange={(e) => savePreferences({ ...preferences, notifyPremiumArtworks: e.target.checked, notificationsEnabled: true, muted: false })} />Marketplace updates</label>
                <label className="inline-check"><input type="checkbox" checked={preferences.notifyComments} onChange={(e) => savePreferences({ ...preferences, notifyComments: e.target.checked, notificationsEnabled: true, muted: false })} />Comments & replies</label>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {error ? <span style={{ color: '#ffb3b3', fontSize: 13 }}>{error}</span> : null}
    </div>
  );
}