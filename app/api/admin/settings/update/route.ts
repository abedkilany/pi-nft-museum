import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { requireAdminApi, PERMISSIONS } from '@/lib/domains/admin';
import { SITE_SETTING_DEFINITIONS, ensureDefaultSiteSettings } from '@/lib/site-settings';
import { logger } from '@/lib/domains/system';
import { assertSameOrigin } from '@/lib/services/request';
import { createAuditLog } from '@/lib/audit';
import { ArtworkStatus } from '@/types/enums';

const STATUS_LIST_KEYS = new Set([
  'home_featured_statuses',
  'review_page_statuses',
  'gallery_public_statuses',
  'premium_gallery_statuses',
]);

const NON_NEGATIVE_NUMBER_KEYS = new Set([
  'home_featured_limit',
  'premium_min_score',
  'premium_like_weight',
  'premium_dislike_weight',
  'premium_rating_weight',
  'public_review_hours',
  'mint_window_days',
  'rating_min',
  'rating_max',
  'auction_default_duration_hours',
  'auction_payment_window_hours',
  'auction_min_increment',
  'auction_commission_percent',
  'auction_anti_snipe_window_minutes',
  'auction_anti_snipe_extend_minutes',
  'auction_anti_snipe_max_extensions',
  'auction_first_non_payment_ban_days',
  'auction_permanent_ban_after_failures',
  'comment_edit_window_hours',
  'comment_first_support_publish_weight',
  'comment_first_support_premium_weight',
  'comment_first_needs_improvement_weight',
  'comment_first_recommend_removal_weight',
  'comment_reply_weight',
  'comment_artist_reply_weight',
  'comment_max_score_per_user_per_artwork',
  'comment_like_weight',
  'comment_like_max_per_comment',
  'artwork_archive_retention_days',
]);

function redirectWithError(request: Request, message: string) {
  const url = new URL('/admin/settings', request.url);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url);
}

function validateSettingValue(key: string, type: string, rawValue: string) {
  const value = rawValue.trim();

  if (type === 'number') {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Setting ${key} must be a valid number.`);
    }
    if (NON_NEGATIVE_NUMBER_KEYS.has(key) && parsed < 0) {
      throw new Error(`Setting ${key} cannot be negative.`);
    }
    if ((key === 'rating_min' || key === 'rating_max') && !Number.isInteger(parsed)) {
      throw new Error(`Setting ${key} must be a whole number.`);
    }
    if (key === 'rating_min' && parsed < 1) {
      throw new Error('Minimum rating must be at least 1.');
    }
    if (key === 'rating_max' && parsed < 1) {
      throw new Error('Maximum rating must be at least 1.');
    }
    if (key === 'auction_min_increment' && parsed < 0.01) {
      throw new Error('Auction minimum increment must be at least 0.01.');
    }
    if (key === 'auction_default_duration_hours' && parsed < 1) {
      throw new Error('Auction default duration must be at least 1 hour.');
    }
    if (key === 'auction_payment_window_hours' && parsed < 1) {
      throw new Error('Auction payment window must be at least 1 hour.');
    }
    if (key === 'auction_permanent_ban_after_failures' && parsed < 2) {
      throw new Error('Permanent auction ban threshold must be 2 or higher.');
    }
    return String(parsed);
  }

  if (type === 'boolean') {
    const normalized = value.toLowerCase();
    if (!['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(normalized)) {
      throw new Error(`Setting ${key} must be true or false.`);
    }
    return ['true', '1', 'yes', 'on'].includes(normalized) ? 'true' : 'false';
  }

  if (type === 'json') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`Setting ${key} must contain valid JSON.`);
    }
    if (key === 'menu_json' && !Array.isArray(parsed)) {
      throw new Error('Menu JSON must be an array of menu items.');
    }
    return JSON.stringify(parsed, null, 2);
  }

  if (key === 'mint_expiry_next_status') {
    if (!Object.values(ArtworkStatus).includes(value as ArtworkStatus)) {
      throw new Error('Status after missed mint must be a valid artwork status.');
    }
    return value;
  }

  if (STATUS_LIST_KEYS.has(key)) {
    const statuses = value.split(',').map((item) => item.trim()).filter(Boolean);
    if (statuses.length === 0) {
      throw new Error(`Setting ${key} must contain at least one artwork status.`);
    }
    for (const status of statuses) {
      if (!Object.values(ArtworkStatus).includes(status as ArtworkStatus)) {
        throw new Error(`Setting ${key} contains an invalid artwork status: ${status}.`);
      }
    }
    return statuses.join(',');
  }

  if (!value) {
    throw new Error(`Setting ${key} cannot be empty.`);
  }

  return value;
}

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi(PERMISSIONS.settingsManage);
  if ('error' in admin) return admin.error;

  try {
    await ensureDefaultSiteSettings();
    const formData = await request.formData();
    const previousSettings = await prisma.siteSetting.findMany({ select: { settingKey: true, settingValue: true } });

    const nextSettings = SITE_SETTING_DEFINITIONS.map((definition) => {
      const rawValue = String(formData.get(definition.key) ?? definition.defaultValue);
      const normalizedValue = validateSettingValue(definition.key, definition.type, rawValue);
      return {
        definition,
        value: normalizedValue,
      };
    });

    const ratingMin = Number(nextSettings.find((item) => item.definition.key === 'rating_min')?.value ?? '1');
    const ratingMax = Number(nextSettings.find((item) => item.definition.key === 'rating_max')?.value ?? '5');
    if (ratingMin > ratingMax) {
      return redirectWithError(request, 'Minimum rating cannot be greater than maximum rating.');
    }

    for (const item of nextSettings) {
      await prisma.siteSetting.upsert({
        where: { settingKey: item.definition.key },
        update: { settingValue: item.value, settingGroup: item.definition.group, isPublic: item.definition.isPublic ?? false },
        create: { settingKey: item.definition.key, settingValue: item.value, settingGroup: item.definition.group, isPublic: item.definition.isPublic ?? false }
      });
    }

    const updatedSettings = await prisma.siteSetting.findMany({ select: { settingKey: true, settingValue: true } });

    await createAuditLog({
      userId: admin.user.userId,
      action: 'ADMIN_SETTINGS_UPDATED',
      targetType: 'SITE_SETTINGS',
      targetId: 'global',
      oldValues: previousSettings,
      newValues: updatedSettings
    });

    logger.info('Settings updated', { userId: admin.user.userId });
    return NextResponse.redirect(new URL('/admin/settings', request.url));
  } catch (error) {
    return redirectWithError(request, error instanceof Error ? error.message : 'Failed to update settings.');
  }
}
