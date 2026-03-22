import { SITE_SETTING_DEFINITIONS, getSiteSettingsMap } from '@/lib/site-settings';

const GROUP_TITLES: Record<string, string> = {
  general: 'General',
  homepage: 'Homepage',
  navigation: 'Navigation',
  business_rules: 'Business rules',
  security: 'Security',
  community: 'Community groundwork'
};

export default async function AdminSettingsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const settings = await getSiteSettingsMap();
  const groups = SITE_SETTING_DEFINITIONS.reduce<Record<string, typeof SITE_SETTING_DEFINITIONS>>((acc, definition) => {
    acc[definition.group] ||= [];
    acc[definition.group].push(definition);
    return acc;
  }, {});

  const message = typeof resolvedSearchParams.message === 'string' ? resolvedSearchParams.message : '';
  const error = typeof resolvedSearchParams.error === 'string' ? resolvedSearchParams.error : '';

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Platform settings</span>
            <h1>Settings</h1>
          </div>
          <p>Control homepage content, business rules, review windows, and future community groundwork with validation and audit logging.</p>
        </div>
        {message ? <p style={{ margin: '12px 0 0', color: 'var(--success, #9fe870)' }}>{message}</p> : null}
        {error ? <p style={{ margin: '12px 0 0', color: 'var(--danger, #ff8b8b)' }}>{error}</p> : null}
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

        <div className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Every successful update is normalized, validated, and written to the audit trail.</p>
          <button className="button primary" type="submit">Save settings</button>
        </div>
      </form>
    </div>
  );
}
