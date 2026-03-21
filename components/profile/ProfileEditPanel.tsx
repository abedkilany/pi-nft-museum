'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { piApiFetch } from '@/lib/pi-auth-client';

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
    showPhonePublic: boolean;
    showCountryPublic: boolean;
  };
  countries: CountryOption[];
};

const OTHER_COUNTRY_VALUE = '__OTHER__';

export default function ProfileEditPanel({ user, countries }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
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
    showCountryPublic: user.showCountryPublic,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const usingOtherCountry = profile.country === OTHER_COUNTRY_VALUE;
  const selectedCountry = countries.find((item) => item.name === profile.country);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    const payload = new FormData();
    Object.entries(profile).forEach(([key, value]) => payload.append(key, typeof value === 'boolean' ? String(value) : value));
    if (avatarFile) payload.append('profileImageFile', avatarFile);
    if (coverFile) payload.append('coverImageFile', coverFile);

    const response = await piApiFetch('/api/account/profile', { method: 'POST', body: payload }).catch(() => null);
    const data = response ? await response.json().catch(() => null) : null;
    setBusy(false);
    setMessage(data?.message || data?.error || 'Profile updated.');

    if (response?.ok) {
      setAvatarFile(null);
      setCoverFile(null);
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <section className="card surface-section">
      <div className="section-head compact">
        <div>
          <span className="section-kicker">Owner tools</span>
          <h2>Edit public profile</h2>
        </div>
        <p>Update the information visitors see on your public creator page.</p>
      </div>

      {!open ? (
        <div className="card-actions" style={{ marginTop: 0 }}>
          <button type="button" className="button primary" onClick={() => setOpen(true)}>Edit profile</button>
        </div>
      ) : (
        <form className="upload-form" onSubmit={saveProfile}>
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
              <p style={{ margin: 0, color: 'var(--muted)' }}>Email visibility stays off for Pi-only accounts. Phone and country can be shown publicly if you want.</p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><input type="checkbox" checked={profile.showPhonePublic} onChange={(e) => setProfile((current) => ({ ...current, showPhonePublic: e.target.checked }))} /> <span>Show phone on public profile</span></label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><input type="checkbox" checked={profile.showCountryPublic} onChange={(e) => setProfile((current) => ({ ...current, showCountryPublic: e.target.checked }))} /> <span>Show country on public profile</span></label>
            </div>
          </div>

          <div className="form-actions">
            <button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save profile'}</button>
            <button className="button secondary" type="button" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
            {message ? <p className="form-message">{message}</p> : null}
          </div>
        </form>
      )}
    </section>
  );
}
