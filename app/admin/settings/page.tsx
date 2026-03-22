'use client';

import { useMemo, useState } from 'react';
import { piApiFetch } from '@/lib/pi-auth-client';
import { useAdminData } from '@/components/admin/useAdminData';

const GROUP_TITLES: Record<string, string> = {
  general: 'General', homepage: 'Homepage', navigation: 'Navigation', business_rules: 'Business rules', security: 'Security', community: 'Community groundwork'
};

export default function AdminSettingsPage() {
  const { data, loading, error } = useAdminData<{ definitions: any[]; settings: Record<string, string> }>('/api/admin/settings/list');
  const [message, setMessage] = useState('');
  const groups = useMemo(() => (data?.definitions || []).reduce((acc: Record<string, any[]>, definition: any) => {
    acc[definition.group] ||= [];
    acc[definition.group].push(definition);
    return acc;
  }, {}), [data]);

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const formData = new FormData(event.currentTarget);
    const response = await piApiFetch('/api/admin/settings/update', { method: 'POST', body: formData });
    setMessage(response.ok ? 'Settings saved.' : 'Failed to save settings.');
  }

  if (loading) return <div className="card" style={{ padding: '24px' }}><p>Loading settings…</p></div>;
  if (error || !data) return <div className="card" style={{ padding: '24px' }}><p>{error || 'Failed to load settings.'}</p></div>;

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}><div className="section-head compact"><div><span className="section-kicker">Platform settings</span><h1>Settings</h1></div><p>Control homepage content, countries, business rules, and future community groundwork without touching code.</p></div>{message ? <p className="form-message">{message}</p> : null}</section>
      <form onSubmit={submitForm} style={{ display: 'grid', gap: '18px' }}>
        {Object.entries(groups).map(([groupKey, definitions]) => (
          <section key={groupKey} className="card" style={{ padding: '20px' }}>
            <h2 style={{ marginTop: 0 }}>{GROUP_TITLES[groupKey] || groupKey}</h2>
            <div style={{ display: 'grid', gap: '14px' }}>
              {(definitions as any[]).map((definition: any) => (
                <label key={definition.key} style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontWeight: 600 }}>{definition.label}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{definition.description}</span>
                  {definition.type === 'boolean' ? <select name={definition.key} defaultValue={data.settings[definition.key] || definition.defaultValue || 'false'}><option value="true">Enabled</option><option value="false">Disabled</option></select> : definition.type === 'number' ? <input type="number" step="0.01" name={definition.key} defaultValue={data.settings[definition.key] || definition.defaultValue || ''} /> : definition.type === 'textarea' ? <textarea name={definition.key} defaultValue={data.settings[definition.key] || definition.defaultValue || ''} rows={4} /> : <input type="text" name={definition.key} defaultValue={data.settings[definition.key] || definition.defaultValue || ''} />}
                </label>
              ))}
            </div>
          </section>
        ))}
        <div className="card-actions"><button type="submit" className="button primary">Save settings</button></div>
      </form>
    </div>
  );
}
