export function normalizeAdminGrant(value: string | string[] | null | undefined): string | null {
  if (Array.isArray(value)) {
    return normalizeAdminGrant(value[0]);
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function withAdminGrant(path: string) {
  return path;
}
