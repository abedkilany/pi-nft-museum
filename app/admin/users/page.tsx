
import { prisma } from '@/lib/prisma';
import { STAFF_ROLES } from '@/lib/roles';
import { getAllowedCountries } from '@/lib/countries';

export default async function AdminUsersPage() {
  const [users, roles, countries] = await Promise.all([
    prisma.user.findMany({ include: { role: true, artworks: true }, orderBy: { createdAt: 'desc' } }),
    prisma.role.findMany({ orderBy: { name: 'asc' } }),
    getAllowedCountries()
  ]);

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div className="section-head compact">
        <div>
          <span className="section-kicker">Users</span>
          <h1>User management</h1>
        </div>
        <p>Edit user identity, Pi-linked role, status, contact fields, and visibility. Password fields are disabled because authentication now uses Pi only.</p>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {users.map((user: any) => (
          <form key={user.id} action="/api/admin/users/update" method="POST" className="card" style={{ padding: '18px', display: 'grid', gap: '14px' }}>
            <input type="hidden" name="userId" value={user.id} />
            <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: '18px', alignItems: 'start' }}>
              <div className="profile-avatar" style={{ width: 84, height: 84 }}>
                {user.profileImage ? <img src={user.profileImage} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{(user.fullName || user.username).slice(0, 1).toUpperCase()}</span>}
              </div>
              <div className="form-grid">
                <label><span>Username</span><input name="username" defaultValue={user.username} /></label>
                <label><span>Full name</span><input name="fullName" defaultValue={user.fullName || ''} /></label>
                <label><span>Pi username</span><input value={user.piUsername || ''} disabled /></label>
                <label><span>Pi UID</span><input value={user.piUid || ''} disabled /></label>
                <label><span>Email</span><input type="email" name="email" defaultValue={user.email} /></label>
                <label><span>Phone</span><input name="phoneNumber" defaultValue={user.phoneNumber || ''} placeholder="+96170123456" /></label>
                <label>
                  <span>Country</span>
                  <select name="country" defaultValue={user.country || ''}>
                    <option value="">Choose country</option>
                    {countries.map((country: any) => <option key={country.id} value={country.name}>{country.name}</option>)}
                  </select>
                </label>
                <label><span>Headline</span><input name="headline" defaultValue={user.headline || ''} placeholder="Member headline" /></label>
                <label>
                  <span>Role</span>
                  <select name="roleId" defaultValue={String(user.roleId)}>
                    {roles.map((role: any) => <option key={role.id} value={role.id}>{role.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Status</span>
                  <select name="status" defaultValue={user.status}>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="PENDING">Pending</option>
                    <option value="BANNED">Banned</option>
                  </select>
                </label>
                <label><span>Profile image URL</span><input name="profileImage" defaultValue={user.profileImage || ''} /></label>
                <label><span>Cover image URL</span><input name="coverImage" defaultValue={user.coverImage || ''} /></label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><input type="checkbox" name="showEmailPublic" defaultChecked={user.showEmailPublic} /> <span>Public email</span></label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><input type="checkbox" name="showPhonePublic" defaultChecked={user.showPhonePublic} /> <span>Public phone</span></label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><input type="checkbox" name="showCountryPublic" defaultChecked={user.showCountryPublic} /> <span>Public country</span></label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><input type="checkbox" name="canEditCommentsAfterDeadline" defaultChecked={Boolean((user as any).canEditCommentsAfterDeadline)} /> <span>Can edit comments after deadline</span></label>
                <label className="full-width"><span>Bio</span><textarea name="bio" rows={3} defaultValue={user.bio || ''} /></label>
              </div>
            </div>
            <div className="card-actions">
              <button className="button primary" type="submit">Save user</button>
              <span className="pill">{user.artworks.length} artworks</span>
              {STAFF_ROLES.includes(user.role.key as any) ? <span className="pill">Staff account</span> : null}
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
