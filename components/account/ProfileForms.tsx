
'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { piApiFetch } from '../../lib/pi-auth-client';

type CountryOption = {
  name: string;
  phoneCode: string;
};

type Props = {
  user: {
    username: string;
    fullName: string;
    email: string;
    bio: string;
    country: string;
    customCountryName: string;
    phoneNumber: string;
    headline: string;
    profileImage: string;
    coverImage: string;
    websiteUrl: string;
    twitterUrl: string;
    instagramUrl: string;
    showEmailPublic: boolean;
    showPhonePublic: boolean;
    showCountryPublic: boolean;
    piUsername?: string;
    piUid?: string;
    piWalletAddress?: string;
  };
  countries: CountryOption[];
};

const OTHER_COUNTRY_VALUE = '__OTHER__';

export function ProfileForms({ user, countries }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState({
    fullName: user.fullName,
    bio: user.bio,
    country: user.country,
    customCountryName: user.customCountryName,
    phoneNumber: user.phoneNumber,
    headline: user.headline,
    profileImage: user.profileImage,
    coverImage: user.coverImage,
    websiteUrl: user.websiteUrl,
    twitterUrl: user.twitterUrl,
    instagramUrl: user.instagramUrl,
    showPhonePublic: user.showPhonePublic,
    showCountryPublic: user.showCountryPublic
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [profileMessage, setProfileMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const usingOtherCountry = profile.country === OTHER_COUNTRY_VALUE;
  const selectedCountry = countries.find((item) => item.name === profile.country);
  const publicCountryLabel = usingOtherCountry ? profile.customCountryName : profile.country;
  const avatarPreview = useMemo(() => (avatarFile ? URL.createObjectURL(avatarFile) : profile.profileImage), [avatarFile, profile.profileImage]);
  const coverPreview = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : profile.coverImage), [coverFile, profile.coverImage]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProfileMessage('');

    const payload = new FormData();
    Object.entries(profile).forEach(([key, value]) => payload.append(key, typeof value === 'boolean' ? String(value) : value));
    if (avatarFile) payload.append('profileImageFile', avatarFile);
    if (coverFile) payload.append('coverImageFile', coverFile);

    const response = await piApiFetch('/api/account/profile', { method: 'POST', body: payload });
    const data = await response.json();
    setBusy(false);
    setProfileMessage(data.message || data.error || 'Done.');
    if (response.ok) {
      setAvatarFile(null);
      setCoverFile(null);
      router.refresh();
    }
  }

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Pi identity</span>
            <h1>Connected Pi account</h1>
          </div>
          <p>Your login is now handled only by Pi. These identity fields are synced from Pi authentication.</p>
        </div>
        <div className="form-grid">
          <div className="card" style={{ padding: '16px' }}>
            <strong>Pi username</strong>
            <p style={{ color: 'var(--muted)' }}>{user.piUsername || user.username}</p>
          </div>
          <div className="card" style={{ padding: '16px' }}>
            <strong>Pi UID</strong>
            <p style={{ color: 'var(--muted)', wordBreak: 'break-all' }}>{user.piUid || 'Not available'}</p>
          </div>
          <div className="card" style={{ padding: '16px' }}>
            <strong>Wallet address</strong>
            <p style={{ color: 'var(--muted)', wordBreak: 'break-all' }}>{user.piWalletAddress || 'Will be available when you request wallet scope later.'}</p>
          </div>
          <div className="card" style={{ padding: '16px' }}>
            <strong>Local username</strong>
            <p style={{ color: 'var(--muted)' }}>{user.username}</p>
          </div>
        </div>
      </section>

      <form className="card upload-form" onSubmit={saveProfile}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Profile details</span>
            <h1>Update profile</h1>
          </div>
          <p>Your public profile can be updated without a password because access is controlled by Pi Browser login.</p>
        </div>

        <div className="card" style={{ padding: '16px', display: 'grid', gap: '14px', marginBottom: '18px' }}>
          <strong>Live preview</strong>
          <div className="profile-cover" style={{ minHeight: '180px', backgroundImage: coverPreview ? `linear-gradient(135deg, rgba(10,12,18,0.35), rgba(10,12,18,0.65)), url(${coverPreview})` : undefined }}>
            <div className="profile-avatar profile-avatar-large">
              {avatarPreview ? <img src={avatarPreview} alt="Avatar preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{(profile.fullName || user.username || 'U').slice(0, 1).toUpperCase()}</span>}
            </div>
            <div>
              <h2 style={{ margin: 0 }}>{profile.fullName || user.username}</h2>
              <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>{profile.headline || 'Your public headline will appear here.'}</p>
              <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>@{user.username}{publicCountryLabel && profile.showCountryPublic ? ` · ${publicCountryLabel}` : ''}{profile.phoneNumber && profile.showPhonePublic ? ` · ${selectedCountry?.phoneCode || ''} ${profile.phoneNumber}` : ''}</p>
            </div>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span>Full name</span>
            <input value={profile.fullName} onChange={(e) => setProfile((current) => ({ ...current, fullName: e.target.value }))} placeholder="Your display name" />
          </label>
          <label>
            <span>Headline</span>
            <input value={profile.headline} onChange={(e) => setProfile((current) => ({ ...current, headline: e.target.value }))} placeholder="Digital artist • Pi creator" />
          </label>
          <label>
            <span>Country</span>
            <select value={profile.country} onChange={(e) => setProfile((current) => ({ ...current, country: e.target.value, customCountryName: e.target.value === OTHER_COUNTRY_VALUE ? current.customCountryName : '' }))}>
              <option value="">Choose country</option>
              {countries.map((country) => <option key={country.name} value={country.name}>{country.name}</option>)}
              <option value={OTHER_COUNTRY_VALUE}>Other country</option>
            </select>
          </label>
          {usingOtherCountry ? (
            <label>
              <span>Other country name</span>
              <input value={profile.customCountryName} onChange={(e) => setProfile((current) => ({ ...current, customCountryName: e.target.value }))} placeholder="Enter your country" />
            </label>
          ) : null}
          <label>
            <span>Phone number</span>
            <input value={profile.phoneNumber} onChange={(e) => setProfile((current) => ({ ...current, phoneNumber: e.target.value }))} placeholder={selectedCountry ? `${selectedCountry.phoneCode} 70 123 456` : '70 123 456'} />
          </label>
          <label>
            <span>Pi login email</span>
            <input value={user.email} disabled />
          </label>
          <label>
            <span>Profile image URL</span>
            <input value={profile.profileImage} onChange={(e) => setProfile((current) => ({ ...current, profileImage: e.target.value }))} placeholder="Optional image URL" />
          </label>
          <label>
            <span>Cover image URL</span>
            <input value={profile.coverImage} onChange={(e) => setProfile((current) => ({ ...current, coverImage: e.target.value }))} placeholder="Optional cover image URL" />
          </label>
          <label>
            <span>Upload profile image</span>
            <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
          </label>
          <label>
            <span>Upload cover image</span>
            <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
          </label>
          <label>
            <span>Website</span>
            <input value={profile.websiteUrl} onChange={(e) => setProfile((current) => ({ ...current, websiteUrl: e.target.value }))} placeholder="https://your-site.com" />
          </label>
          <label>
            <span>X / Twitter</span>
            <input value={profile.twitterUrl} onChange={(e) => setProfile((current) => ({ ...current, twitterUrl: e.target.value }))} placeholder="https://x.com/username" />
          </label>
          <label className="full-width">
            <span>Instagram</span>
            <input value={profile.instagramUrl} onChange={(e) => setProfile((current) => ({ ...current, instagramUrl: e.target.value }))} placeholder="https://instagram.com/username" />
          </label>
          <label className="full-width">
            <span>Bio</span>
            <textarea rows={5} value={profile.bio} onChange={(e) => setProfile((current) => ({ ...current, bio: e.target.value }))} placeholder="Tell the community about yourself, your art style, and your Pi mission." />
          </label>
          <div className="full-width card" style={{ padding: '16px', display: 'grid', gap: '12px' }}>
            <strong>Public visibility</strong>
            <p style={{ margin: 0, color: 'var(--muted)' }}>Email visibility is disabled for Pi-only accounts by default.</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><input type="checkbox" checked={profile.showPhonePublic} onChange={(e) => setProfile((current) => ({ ...current, showPhonePublic: e.target.checked }))} /> <span>Show phone on public profile</span></label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><input type="checkbox" checked={profile.showCountryPublic} onChange={(e) => setProfile((current) => ({ ...current, showCountryPublic: e.target.checked }))} /> <span>Show country on public profile</span></label>
          </div>
        </div>

        <div className="form-actions">
          <button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save profile'}</button>
          {profileMessage ? <p className="form-message">{profileMessage}</p> : null}
        </div>
      </form>
    </div>
  );
}