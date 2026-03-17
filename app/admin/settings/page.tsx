import { SITE_SETTING_DEFINITIONS, getSiteSettingsMap } from '@/lib/site-settings';

const GROUP_TITLES: Record<string, string> = {
  general: 'General',
  homepage: 'Homepage',
  navigation: 'Navigation',
  business_rules: 'Business rules',
  security: 'Security',
  community: 'Community groundwork'
};

export default async function AdminSettingsPage() {
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
              {definitions.map((definition) => (
                <label key={definition.key} style={{ display: 'grid', gap: '6px' }}>
                  <span>{definition.label}</span>
                  {definition.type === 'textarea' || definition.type === 'json' ? (
                    <textarea
                      name={definition.key}
                      rows={definition.type === 'json' ? 8 : 4}
                      defaultValue={settings[definition.key]}
                    />
                  ) : definition.type === 'boolean' ? (
                    <select name={definition.key} defaultValue={settings[definition.key]}>
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  ) : (
                    <input
                      name={definition.key}
                      type={definition.type === 'number' ? 'number' : 'text'}
                      step={definition.type === 'number' ? 'any' : undefined}
                      defaultValue={settings[definition.key]}
                    />
                  )}
                  {definition.description ? <small style={{ color: 'var(--muted)' }}>{definition.description}</small> : null}
                </label>
              ))}
            </div>
          </section>
        ))}

        <div className="card-actions">
          <button className="button primary" type="submit">Save settings</button>
        </div>
      </form>

      <form action="/api/admin/settings/recalculate-review-windows" method="POST">
        <button className="button secondary" type="submit">Recalculate review and mint windows</button>
      </form>
    </div>
  );
}
