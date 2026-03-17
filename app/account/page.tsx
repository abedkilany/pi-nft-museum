
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';
import { ProfileForms } from '@/components/account/ProfileForms';
import { DeleteAccountSection } from '@/components/account/DeleteAccountSection';
import { getAllowedCountries } from '@/lib/countries';

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [dbUser, countries] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.userId },
      include: { artworks: { orderBy: { createdAt: 'desc' }, take: 5 }, role: true }
    }),
    getAllowedCountries()
  ]);
  if (!dbUser) redirect('/login');

  return (
    <div style={{ paddingTop: '30px', display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Account hub</span>
            <h1>My Account</h1>
          </div>
          <p>Manage your Pi-linked profile, privacy, and marketplace access from one place. Guests browse as Visitors, while connected Pi accounts become Artist or Trader by default.</p>
        </div>
        <div className="form-grid">
          <div className="card" style={{ padding: '16px' }}><strong>Pi username</strong><p style={{ color: 'var(--muted)' }}>{dbUser.piUsername || dbUser.username}</p></div>
          <div className="card" style={{ padding: '16px' }}><strong>Pi UID</strong><p style={{ color: 'var(--muted)', wordBreak: 'break-all' }}>{dbUser.piUid || 'Not linked yet'}</p></div>
          <div className="card" style={{ padding: '16px' }}><strong>Phone</strong><p style={{ color: 'var(--muted)' }}>{dbUser.phoneNumber || 'Not added yet'}</p></div>
          <div className="card" style={{ padding: '16px' }}><strong>Country</strong><p style={{ color: 'var(--muted)' }}>{dbUser.country === '__OTHER__' ? (dbUser.customCountryName || 'Other country') : (dbUser.country || 'Not set')}</p></div>
          <div className="card" style={{ padding: '16px' }}><strong>Role</strong><p style={{ color: 'var(--muted)' }}>{dbUser.role.name}</p></div>
          <div className="card" style={{ padding: '16px' }}><strong>Linked at</strong><p style={{ color: 'var(--muted)' }}>{dbUser.piLinkedAt ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(dbUser.piLinkedAt) : 'Not linked yet'}</p></div>
        </div>
        <div className="card-actions">
          <Link href={`/profile/${dbUser.username}`} className="button secondary">Open public profile</Link>
          <Link href="/profile" className="button secondary">Open member dashboard</Link>
          <Link href="/account/artworks" className="button secondary">My artworks</Link>
          <Link href="/upload" className="button primary">Upload artwork</Link>
          {isAdminRole(user.role) ? <Link href="/admin" className="button secondary">Admin panel</Link> : null}
        </div>
      </section>

      <ProfileForms
        user={{
          username: dbUser.username,
          fullName: dbUser.fullName || '',
          email: dbUser.email,
          bio: dbUser.bio || '',
          country: dbUser.country || '',
          customCountryName: dbUser.customCountryName || '',
          phoneNumber: dbUser.phoneNumber || '',
          headline: dbUser.headline || '',
          profileImage: dbUser.profileImage || '',
          coverImage: dbUser.coverImage || '',
          websiteUrl: dbUser.websiteUrl || '',
          twitterUrl: dbUser.twitterUrl || '',
          instagramUrl: dbUser.instagramUrl || '',
          showEmailPublic: dbUser.showEmailPublic,
          showPhonePublic: dbUser.showPhonePublic,
          showCountryPublic: dbUser.showCountryPublic,
          piUsername: dbUser.piUsername || '',
          piUid: dbUser.piUid || '',
          piWalletAddress: dbUser.piWalletAddress || ''
        }}
        countries={countries.map((country: any) => ({ name: country.name, phoneCode: country.phoneCode }))}
      />

      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Recent activity</span>
            <h2>Latest artworks</h2>
          </div>
          <p>You can continue editing, resubmitting, minting, or deleting from the artwork area.</p>
        </div>
        {dbUser.artworks.length === 0 ? <p style={{ margin: 0 }}>You have not submitted any artworks yet.</p> : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {dbUser.artworks.map((artwork: any) => (
              <div key={artwork.id} className="card" style={{ padding: '16px', display: 'grid', gridTemplateColumns: '84px 1fr auto', gap: '14px', alignItems: 'center' }}>
                <img src={artwork.imageUrl} alt={artwork.title} style={{ width: 84, height: 64, objectFit: 'cover', borderRadius: 12 }} />
                <div>
                  <strong>{artwork.title}</strong>
                  <p style={{ color: 'var(--muted)', margin: '6px 0 0' }}>{artwork.status}</p>
                </div>
                <Link href={`/artwork/${artwork.id}`} className="button secondary">View</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <DeleteAccountSection />
    </div>
  );
}
