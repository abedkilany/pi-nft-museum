import { SITE_SETTING_DEFINITIONS, getSiteSettingsMap } from '@/lib/site-settings';
import { requireAdminPage } from '@/lib/admin';

const GROUP_TITLES: Record<string, string> = {
  general: 'General',
  homepage: 'Homepage',
  navigation: 'Navigation',
  business_rules: 'Business rules',
  security: 'Security',
  community: 'Community groundwork'
};

export default async function AdminSettingsPage() {
  await requireAdminPage();

  const settings = await getSiteSettingsMap();
  const groups = SITE_SETTING_DEFINITIONS.reduce<Record<string, typeof SITE_SETTING_DEFINITIONS>>((acc, definition) => {
    acc[definition.group] ||= [];
    acc[definition.group].push(definition);
    return acc;
  }, {});

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Platform settings</span>
            <h1>Settings</h1>
          </div>
          <p>Control homepage content, countries, business rules, and future community groundwork without touching code.</p>
        </div>
      </section>

      <form action="/api/admin/settings/update" method="POST" style={{ display: 'grid', gap: '18px' }}>
        {Object.entries(groups).map(([groupKey, definitions]) => (
          <section key={groupKey} className="card" style={{ padding: '20px' }}>
            <h2 style={{ marginTop: 0 }}>{GROUP_TITLES[groupKey] || groupKey}</h2>
            <div style={{ display: 'grid', gap: '14px' }}>
              {definitions.map((definition: any) => (
                <label key={definition.key} style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontWeight: 600 }}>{definition.label}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{definition.description}</span>
                  {definition.type === 'boolean' ? (
                    <select name={definition.key} defaultValue={settings[definition.key] || definition.defaultValue || 'false'}>
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  ) : definition.type === 'number' ? (
                    <input type="number" step="0.01" name={definition.key} defaultValue={settings[definition.key] || definition.defaultValue || ''} />
                  ) : definition.type === 'textarea' ? (
                    <textarea name={definition.key} defaultValue={settings[definition.key] || definition.defaultValue || ''} rows={4} />
                  ) : (
                    <input type="text" name={definition.key} defaultValue={settings[definition.key] || definition.defaultValue || ''} />
                  )}
                </label>
              ))}
            </div>
          </section>
        ))}

        <div className="card-actions">
          <button type="submit" className="button primary">Save settings</button>
        </div>
      </form>
    </div>
  );
}
