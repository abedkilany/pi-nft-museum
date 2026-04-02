import { prisma } from '@/lib/domains/system';
import {
  PERMISSIONS,
  PERMISSION_DEFINITIONS,
  PERMISSION_GROUP_LABELS,
  isSystemRole,
} from '@/lib/permissions';
import { requireAdminPage } from '@/lib/domains/admin';

function slugifyRoleKey(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await requireAdminPage(PERMISSIONS.userRolesManage);

  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      orderBy: [{ key: 'asc' }],
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    }),
    prisma.permission.findMany({
      orderBy: [{ key: 'asc' }],
    }),
  ]);

  const permissionsByGroup = PERMISSION_DEFINITIONS.reduce<Record<string, typeof PERMISSION_DEFINITIONS>>((acc, item) => {
    acc[item.group] ||= [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const queryState = typeof searchParams?.updated === 'string'
    ? 'updated'
    : typeof searchParams?.created === 'string'
      ? 'created'
      : typeof searchParams?.deleted === 'string'
        ? 'deleted'
        : typeof searchParams?.superadminPermissionsFixed === 'string'
          ? 'superadmin-permissions-fixed'
          : typeof searchParams?.error === 'string'
            ? String(searchParams.error)
            : null;

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Access control</span>
            <h1>Roles &amp; permissions</h1>
          </div>
          <p>Manage staff access from inside the admin panel. Superadmin remains protected and custom roles can be created without touching the seed file.</p>
        </div>
        <div className="card-actions" style={{ marginTop: '18px' }}>
          <span className="pill">{roles.length} roles</span>
          <span className="pill">{permissions.length} permissions</span>
          <span className="pill">Superadmin only</span>
        </div>
        <div className="card-actions" style={{ marginTop: '18px' }}>
          {roles.map((role) => (
            <a key={role.id} href={`#role-${role.key}`} className="button secondary">
              {role.name}
            </a>
          ))}
        </div>
        {queryState ? (
          <p className="form-message" style={{ marginTop: '18px' }}>
            {queryState === 'updated' && 'Role permissions were updated.'}
            {queryState === 'created' && 'New role created successfully.'}
            {queryState === 'deleted' && 'Role deleted successfully.'}
            {queryState === 'missing-fields' && 'Please complete the required fields.'}
            {queryState === 'duplicate-role' && 'A role with this key already exists.'}
            {queryState === 'invalid-role-key' && 'Role key must contain at least 3 valid characters.'}
            {queryState === 'not-found' && 'The selected role could not be found.'}
            {queryState === 'cannot-delete-system-role' && 'System roles cannot be deleted from the dashboard.'}
            {queryState === 'role-has-users' && 'Move users out of this role before deleting it.'}
            {queryState === 'superadmin-permissions-fixed' && 'Superadmin always keeps every permission.'}
            {queryState === 'unknown-permission' && 'One of the submitted permissions is invalid.'}
          </p>
        ) : null}
      </section>

      <details className="card admin-accordion">
        <summary className="admin-accordion-summary">
          <div>
            <h2 style={{ margin: 0 }}>Create role</h2>
            <p style={{ color: 'var(--muted)', margin: '8px 0 0' }}>Use this for support, finance, editors, or any future staff workflow.</p>
          </div>
          <span className="pill">Open form</span>
        </summary>
        <div className="admin-accordion-content">
          <form action="/api/admin/roles/create" method="POST" style={{ display: 'grid', gap: '16px' }}>
            <div className="form-grid">
              <label>
                <span>Role name</span>
                <input name="name" placeholder="Support Agent" required />
              </label>
              <label>
                <span>Role key</span>
                <input name="key" placeholder={slugifyRoleKey('Support Agent')} />
              </label>
              <label className="full-width">
                <span>Description</span>
                <textarea name="description" rows={3} placeholder="Handles incoming reports and account support requests." />
              </label>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              {Object.entries(permissionsByGroup).map(([groupKey, groupPermissions]) => (
                <details key={groupKey} className="card admin-accordion">
                  <summary className="admin-accordion-summary">
                    <div>
                      <strong style={{ display: 'block' }}>{PERMISSION_GROUP_LABELS[groupKey as keyof typeof PERMISSION_GROUP_LABELS]}</strong>
                      <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Choose the actions this role is allowed to perform.</span>
                    </div>
                    <span className="pill">{groupPermissions.length} permissions</span>
                  </summary>
                  <div className="admin-accordion-content">
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {groupPermissions.map((permission) => (
                        <label key={permission.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <input type="checkbox" name="permissionKeys" value={permission.key} style={{ width: '18px', height: '18px', marginTop: '2px' }} />
                          <span>
                            <strong style={{ display: 'block' }}>{permission.label}</strong>
                            <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{permission.description}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
            </div>

            <div className="card-actions">
              <button className="button primary" type="submit">Create role</button>
            </div>
          </form>
        </div>
      </details>

      <div style={{ display: 'grid', gap: '18px' }}>
        {roles.map((role) => {
          const assignedPermissionKeys = new Set(role.permissions.map((entry) => entry.permission.key));
          const usersCount = role._count.users;
          const isSuperadmin = role.key === 'superadmin';
          const isSystem = isSystemRole(role.key);
          const effectivePermissions = new Set(isSuperadmin ? permissions.map((permission) => permission.key) : Array.from(assignedPermissionKeys));

          return (
            <details key={role.id} id={`role-${role.key}`} className="card admin-accordion">
              <summary className="admin-accordion-summary">
                <div>
                  <h2 style={{ margin: 0 }}>{role.name}</h2>
                  <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>{role.description || 'No description yet.'}</p>
                </div>
                <div className="card-actions" style={{ marginTop: 0, justifyContent: 'flex-end' }}>
                  <span className="pill">key: {role.key}</span>
                  <span className="pill">{usersCount} users</span>
                  <span className="pill">{effectivePermissions.size} permissions</span>
                  {isSystem ? <span className="pill">System role</span> : <span className="pill">Custom role</span>}
                </div>
              </summary>

              <div className="admin-accordion-content">
                <form action="/api/admin/roles/update" method="POST" style={{ display: 'grid', gap: '16px' }}>
                  <input type="hidden" name="roleId" value={role.id} />
                  <div className="form-grid">
                    <label>
                      <span>Role name</span>
                      <input name="name" defaultValue={role.name} required />
                    </label>
                    <label>
                      <span>Role key</span>
                      <input defaultValue={role.key} disabled />
                    </label>
                    <label className="full-width">
                      <span>Description</span>
                      <textarea name="description" rows={3} defaultValue={role.description || ''} />
                    </label>
                  </div>

                  <div style={{ display: 'grid', gap: '16px' }}>
                    {Object.entries(permissionsByGroup).map(([groupKey, groupPermissions]) => (
                      <details key={`${role.id}-${groupKey}`} className="card admin-accordion">
                        <summary className="admin-accordion-summary">
                          <div>
                            <strong style={{ display: 'block' }}>{PERMISSION_GROUP_LABELS[groupKey as keyof typeof PERMISSION_GROUP_LABELS]}</strong>
                            <span style={{ color: 'var(--muted)', fontSize: '14px' }}>
                              {isSuperadmin ? 'Superadmin keeps every permission by design.' : 'Toggle access for this role.'}
                            </span>
                          </div>
                          <span className="pill">{groupPermissions.length} permissions</span>
                        </summary>
                        <div className="admin-accordion-content">
                          <div style={{ display: 'grid', gap: '10px' }}>
                            {groupPermissions.map((permission) => {
                              const checked = isSuperadmin || assignedPermissionKeys.has(permission.key);
                              return (
                                <label key={permission.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', opacity: isSuperadmin ? 0.85 : 1 }}>
                                  <input
                                    type="checkbox"
                                    name="permissionKeys"
                                    value={permission.key}
                                    defaultChecked={checked}
                                    disabled={isSuperadmin}
                                    style={{ width: '18px', height: '18px', marginTop: '2px' }}
                                  />
                                  <span>
                                    <strong style={{ display: 'block' }}>{permission.label}</strong>
                                    <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{permission.description}</span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>

                  <div className="card-actions">
                    <button className="button primary" type="submit">Save role</button>
                    {isSuperadmin ? <span className="pill">Immutable permission set</span> : null}
                  </div>
                </form>

                {!isSystem ? (
                  <form action="/api/admin/roles/delete" method="POST">
                    <input type="hidden" name="roleId" value={role.id} />
                    <button className="button secondary" type="submit">Delete role</button>
                  </form>
                ) : null}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
