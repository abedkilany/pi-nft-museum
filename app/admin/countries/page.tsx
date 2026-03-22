'use client';

import { useState } from 'react';
import { piApiFetch } from '@/lib/pi-auth-client';
import { useAdminData } from '@/components/admin/useAdminData';

export default function AdminCountriesPage() {
  const { data, loading, error, reload } = useAdminData<any[]>('/api/admin/countries/list');
  const [message, setMessage] = useState('');

  async function submitForm(event: React.FormEvent<HTMLFormElement>, endpoint: string) {
    event.preventDefault();
    setMessage('');
    const formData = new FormData(event.currentTarget);
    const response = await piApiFetch(endpoint, { method: 'POST', body: formData });
    setMessage(response.ok ? 'Country updated.' : 'Failed to save country.');
    if (response.ok) reload();
  }

  if (loading) return <div className="card" style={{ padding: '24px' }}><p>Loading countries…</p></div>;
  if (error || !data) return <div className="card" style={{ padding: '24px' }}><p>{error || 'Failed to load countries.'}</p></div>;

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div><span className="section-kicker">Localization</span><h1>Countries</h1></div>
          <p>Manage the country list used in profiles through bearer-authenticated requests only.</p>
        </div>
        {message ? <p className="form-message">{message}</p> : null}
      </section>
      <section className="card" style={{ padding: '24px' }}>
        <form onSubmit={(e) => submitForm(e, '/api/admin/countries/create')} className="form-grid">
          <label><span>Country</span><input name="name" required placeholder="Kosovo" /></label>
          <label><span>ISO</span><input name="isoCode" required placeholder="XK" maxLength={3} /></label>
          <label><span>Phone code</span><input name="phoneCode" required placeholder="+383" /></label>
          <label><span>Allowed</span><select name="allowed" defaultValue="true"><option value="true">Allowed</option><option value="false">Blocked</option></select></label>
          <div className="form-actions" style={{ gridColumn: '1 / -1', marginTop: 0 }}><button className="button primary" type="submit">Add country</button></div>
        </form>
      </section>
      <div style={{ display: 'grid', gap: '12px' }}>
        {data.map((country: any) => (
          <form key={country.id} onSubmit={(e) => submitForm(e, '/api/admin/countries/update')} className="card" style={{ padding: '16px', display: 'grid', gap: '12px' }}>
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
