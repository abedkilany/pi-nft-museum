export function normalizeAdminGrant(value: string | string[] | null | undefined): string | null {
  if (Array.isArray(value)) {
    return normalizeAdminGrant(value[0]);
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function withAdminGrant(path: string, adminGrant?: string | null): string {
  const grant = normalizeAdminGrant(adminGrant);
  if (!grant) return path;

  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}admin_grant=${encodeURIComponent(grant)}`;
}
