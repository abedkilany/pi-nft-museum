import { SITE_SETTING_DEFINITIONS, type SiteSettingDefinition } from '@/lib/site-settings';

export type ValidatedSiteSetting = {
  key: string;
  group: string;
  value: string;
};

const STATUS_LIST_KEYS = new Set([
  'home_featured_statuses',
  'review_page_statuses',
  'gallery_public_statuses',
  'premium_gallery_statuses',
]);

const BOOLEAN_TRUE = new Set(['true', '1', 'yes', 'on']);
const BOOLEAN_FALSE = new Set(['false', '0', 'no', 'off']);

function normalizeBoolean(value: string, fallback: string) {
  const lowered = value.trim().toLowerCase();
  if (BOOLEAN_TRUE.has(lowered)) return 'true';
  if (BOOLEAN_FALSE.has(lowered)) return 'false';
  return fallback;
}

function sanitizeJson(value: string, fallback: string) {
  const parsed = JSON.parse(value);
  return JSON.stringify(parsed, null, 2);
}

function sanitizeNumber(value: string, fallback: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error('Expected a numeric value.');
  return String(parsed);
}

function sanitizeCsvStatuses(value: string) {
  const statuses = value
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  if (!statuses.length) {
    throw new Error('Please provide at least one status.');
  }

  return Array.from(new Set(statuses)).join(',');
}

function sanitizeText(value: string) {
  return value.replace(/\r\n/g, '\n').trim();
}

function sanitizeByDefinition(definition: SiteSettingDefinition, rawValue: string) {
  const value = rawValue.trim();

  switch (definition.type) {
    case 'boolean':
      return normalizeBoolean(value, definition.defaultValue);
    case 'number':
      return sanitizeNumber(value || definition.defaultValue, definition.defaultValue);
    case 'json':
      return sanitizeJson(value || definition.defaultValue, definition.defaultValue);
    case 'textarea':
    case 'text': {
      const sanitized = sanitizeText(value || definition.defaultValue);
      if (STATUS_LIST_KEYS.has(definition.key)) return sanitizeCsvStatuses(sanitized);
      return sanitized;
    }
    default:
      return value || definition.defaultValue;
  }
}

export function validateSiteSettingsForm(formData: FormData): {
  ok: true;
  values: ValidatedSiteSetting[];
} | {
  ok: false;
  message: string;
  field?: string;
} {
  const values: ValidatedSiteSetting[] = [];

  for (const definition of SITE_SETTING_DEFINITIONS) {
    const rawValue = String(formData.get(definition.key) ?? definition.defaultValue);

    try {
      const value = sanitizeByDefinition(definition, rawValue);
      values.push({ key: definition.key, group: definition.group, value });
    } catch (error) {
      return {
        ok: false,
        field: definition.key,
        message: error instanceof Error ? error.message : 'Invalid setting value.',
      };
    }
  }

  return { ok: true, values };
}
