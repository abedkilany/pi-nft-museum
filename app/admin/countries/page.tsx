
import { ensureDefaultCountries } from '@/lib/countries';
import { prisma } from '@/lib/prisma';


import { requireAdminPage } from '@/lib/admin';
export default async function AdminCountriesPage() {
  await requireAdminPage();
  await ensureDefaultCountries();
  const countries = await prisma.country.findMany({ orderBy: [{ name: 'asc' }] });

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Localization</span>
            <h1>Countries</h1>
          </div>
          <p>Manage the country list used in profiles. Admin actions now rely on your active Pi session instead of a local password.</p>
        </div>
      </section>

      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Add country</span>
            <h2>New country entry</h2>
          </div>
          <p>The default list is preloaded alphabetically. You can still add an extra custom country when needed.</p>
        </div>
        <form action="/api/admin/countries/create" method="POST" className="form-grid">
          <label><span>Country</span><input name="name" required placeholder="Kosovo" /></label>
          <label><span>ISO</span><input name="isoCode" required placeholder="XK" maxLength={3} /></label>
          <label><span>Phone code</span><input name="phoneCode" required placeholder="+383" /></label>
          <label><span>Allowed</span><select name="allowed" defaultValue="true"><option value="true">Allowed</option><option value="false">Blocked</option></select></label>
          <div className="form-actions" style={{ gridColumn: '1 / -1', marginTop: 0 }}>
            <button className="button primary" type="submit">Add country</button>
          </div>
        </form>
      </section>

      <div style={{ display: 'grid', gap: '12px' }}>
        {countries.map((country: any) => (
          <form key={country.id} action="/api/admin/countries/update" method="POST" className="card" style={{ padding: '16px', display: 'grid', gap: '12px' }}>
            <input type="hidden" name="countryId" value={country.id} />
            <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr auto' }}>
              <label><span>Country</span><input name="name" defaultValue={country.name} required /></label>
              <label><span>ISO</span><input name="isoCode" defaultValue={country.isoCode} required /></label>
              <label><span>Phone code</span><input name="phoneCode" defaultValue={country.phoneCode} required /></label>
              <label><span>Allowed</span><select name="allowed" defaultValue={country.allowed ? 'true' : 'false'}><option value="true">Allowed</option><option value="false">Blocked</option></select></label>
              <div style={{ display: 'flex', alignItems: 'end' }}><button className="button secondary" type="submit">Save</button></div>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}