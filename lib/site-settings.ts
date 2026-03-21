import { unstable_noStore as noStore } from 'next/cache';
import { prisma } from '@/lib/prisma';

export type SettingType = 'text' | 'number' | 'boolean' | 'textarea' | 'json';
export type SiteSettingsMap = Record<string, string>;

export type SiteSettingDefinition = {
  key: string;
  label: string;
  group: string;
  type: SettingType;
  defaultValue: string;
  isPublic?: boolean;
  description?: string;
};

const DEFAULT_MENU = [
  { label: 'Home', href: '/', visibility: 'public', enabled: true },
  { label: 'Gallery', href: '/gallery', visibility: 'public', enabled: true },
  { label: 'Premium', href: '/premium', visibility: 'public', enabled: true },
  { label: 'Review', href: '/review', visibility: 'public', enabled: true },
  { label: 'Upload', href: '/upload', visibility: 'auth', enabled: true },
  { label: 'Community', href: '/community', visibility: 'public', enabled: true }
];

const DEFAULT_COUNTRIES = [
  'Lebanon','Jordan','Egypt','Saudi Arabia','United Arab Emirates','Qatar','Kuwait','Bahrain','Oman','Iraq','Syria','Turkey','Palestine','Morocco','Algeria','Tunisia','Libya','Sudan','Yemen','France','Germany','Italy','Spain','United Kingdom','Canada','United States','Brazil','Argentina','India','Pakistan','Bangladesh','Indonesia','Malaysia','Philippines','Singapore','South Korea','Japan','Australia','South Africa'
].join(',');

export const SITE_SETTING_DEFINITIONS: SiteSettingDefinition[] = [
  { key: 'site_name', label: 'Site name', group: 'general', type: 'text', defaultValue: 'Pi NFT Museum', isPublic: true },
  { key: 'site_tagline', label: 'Site tagline', group: 'general', type: 'textarea', defaultValue: 'A digital museum for NFT artworks on Pi Network', isPublic: true },
  { key: 'default_currency', label: 'Default currency', group: 'general', type: 'text', defaultValue: 'PI', isPublic: true },
  { key: 'placeholder_artwork_image_url', label: 'Default artwork image', group: 'general', type: 'text', defaultValue: '/placeholder-artwork.svg', isPublic: true },

  { key: 'home_featured_limit', label: 'Homepage featured limit', group: 'homepage', type: 'number', defaultValue: '6' },
  { key: 'home_featured_statuses', label: 'Homepage featured statuses', group: 'homepage', type: 'text', defaultValue: 'PUBLISHED,PREMIUM' },
  { key: 'home_hero_title', label: 'Homepage hero title', group: 'homepage', type: 'text', defaultValue: 'Pi NFT Museum' },
  { key: 'home_hero_text', label: 'Homepage hero text', group: 'homepage', type: 'textarea', defaultValue: 'Curate, review, mint, and showcase Pi-native digital art on a stable platform built for future Pi Network integration.' },

  { key: 'menu_json', label: 'Menu JSON', group: 'navigation', type: 'json', defaultValue: JSON.stringify(DEFAULT_MENU, null, 2), description: 'Advanced fallback for the navigation menu.' },
  { key: 'allowed_countries', label: 'Allowed countries', group: 'general', type: 'text', defaultValue: DEFAULT_COUNTRIES, description: 'Comma-separated country list used as fallback.' },

  { key: 'premium_min_score', label: 'Premium minimum score', group: 'business_rules', type: 'number', defaultValue: '1000' },
  { key: 'premium_like_weight', label: 'Like weight', group: 'business_rules', type: 'number', defaultValue: '1' },
  { key: 'premium_dislike_weight', label: 'Dislike weight', group: 'business_rules', type: 'number', defaultValue: '-1' },
  { key: 'premium_rating_weight', label: 'Rating weight', group: 'business_rules', type: 'number', defaultValue: '3' },
  { key: 'public_review_hours', label: 'Public review hours', group: 'business_rules', type: 'number', defaultValue: '48' },
  { key: 'mint_window_days', label: 'Mint window days', group: 'business_rules', type: 'number', defaultValue: '7' },
  { key: 'mint_expiry_next_status', label: 'Status after missed mint', group: 'business_rules', type: 'text', defaultValue: 'PENDING' },
  { key: 'rating_min', label: 'Minimum rating', group: 'business_rules', type: 'number', defaultValue: '1' },
  { key: 'rating_max', label: 'Maximum rating', group: 'business_rules', type: 'number', defaultValue: '5' },
  { key: 'premium_allow_dislike', label: 'Allow dislike on premium', group: 'business_rules', type: 'boolean', defaultValue: 'false' },

  { key: 'review_page_statuses', label: 'Review page statuses', group: 'business_rules', type: 'text', defaultValue: 'PUBLIC_REVIEW,MINTING', description: 'Statuses visible on the public review page.' },
  { key: 'gallery_public_statuses', label: 'Main gallery statuses', group: 'business_rules', type: 'text', defaultValue: 'PUBLISHED', description: 'Statuses visible in the main gallery.' },
  { key: 'premium_gallery_statuses', label: 'Premium gallery statuses', group: 'business_rules', type: 'text', defaultValue: 'PREMIUM', description: 'Statuses visible in the premium gallery.' },
  { key: 'allow_public_review_reactions', label: 'Allow public review reactions', group: 'business_rules', type: 'boolean', defaultValue: 'true', description: 'Reserved for future public review reaction controls.' },

  { key: 'allow_public_registration', label: 'Allow public registration', group: 'security', type: 'boolean', defaultValue: 'true' },
  { key: 'community_enabled', label: 'Enable community area', group: 'community', type: 'boolean', defaultValue: 'false' },
  { key: 'community_post_moderation', label: 'Moderate future posts', group: 'community', type: 'boolean', defaultValue: 'true' },

  { key: 'comments_enabled', label: 'Enable artwork comments', group: 'community', type: 'boolean', defaultValue: 'true' },
  { key: 'comment_edit_window_hours', label: 'Comment edit window (hours)', group: 'community', type: 'number', defaultValue: '12' },
  { key: 'comment_first_support_publish_weight', label: 'First comment: support publish', group: 'community', type: 'number', defaultValue: '2' },
  { key: 'comment_first_support_premium_weight', label: 'First comment: support premium', group: 'community', type: 'number', defaultValue: '4' },
  { key: 'comment_first_needs_improvement_weight', label: 'First comment: needs improvement', group: 'community', type: 'number', defaultValue: '0' },
  { key: 'comment_first_recommend_removal_weight', label: 'First comment: recommend removal', group: 'community', type: 'number', defaultValue: '-3' },
  { key: 'comment_reply_weight', label: 'Reply/comment weight', group: 'community', type: 'number', defaultValue: '1' },
  { key: 'comment_artist_reply_weight', label: 'Artist reply weight', group: 'community', type: 'number', defaultValue: '1' },
  { key: 'comment_max_score_per_user_per_artwork', label: 'Max comment score per user per artwork', group: 'community', type: 'number', defaultValue: '10' },
  { key: 'comment_like_weight', label: 'Comment like weight', group: 'community', type: 'number', defaultValue: '0.2' },
  { key: 'comment_like_max_per_comment', label: 'Max score from likes per comment', group: 'community', type: 'number', defaultValue: '5' },
  { key: 'artwork_archive_retention_days', label: 'Artwork archive retention days', group: 'business_rules', type: 'number', defaultValue: '30' },
  { key: 'artwork_archive_message_artist', label: 'Artwork archive message', group: 'business_rules', type: 'textarea', defaultValue: 'Your artwork has been archived. It will be permanently deleted after {days} days unless you restore it or delete it permanently yourself.' },
];

export const DEFAULT_SITE_SETTINGS: SiteSettingsMap = Object.fromEntries(
  SITE_SETTING_DEFINITIONS.map((item) => [item.key, item.defaultValue])
);

export async function ensureDefaultSiteSettings() {
  for (const item of SITE_SETTING_DEFINITIONS) {
    const existing = await prisma.siteSetting.findUnique({
      where: { settingKey: item.key },
      select: { settingKey: true }
    });

    if (!existing) {
      await prisma.siteSetting.create({
        data: {
          settingKey: item.key,
          settingValue: item.defaultValue,
          settingGroup: item.group,
          isPublic: item.isPublic ?? false
        }
      });
    }
  }
}

export async function getSiteSettingsMap() {
  noStore();
  const settings = await prisma.siteSetting.findMany({
    where: { settingKey: { in: Object.keys(DEFAULT_SITE_SETTINGS) } },
    select: { settingKey: true, settingValue: true }
  });

  const map: SiteSettingsMap = { ...DEFAULT_SITE_SETTINGS };
  for (const item of settings) {
    map[item.settingKey] = item.settingValue || DEFAULT_SITE_SETTINGS[item.settingKey] || '';
  }
  return map;
}

export function getStringSetting(settings: SiteSettingsMap, key: string, fallback: string) {
  const value = String(settings[key] ?? '').trim();
  return value || fallback;
}

export function getNumberSetting(settings: SiteSettingsMap, key: string, fallback: number) {
  const parsed = Number(getStringSetting(settings, key, String(fallback)));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getBooleanSetting(settings: SiteSettingsMap, key: string, fallback: boolean) {
  const value = getStringSetting(settings, key, String(fallback)).toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(value)) return true;
  if (['false', '0', 'no', 'off'].includes(value)) return false;
  return fallback;
}

export function getArraySetting(settings: SiteSettingsMap, key: string, fallback: string[] = []) {
  const raw = getStringSetting(settings, key, '');
  if (!raw) return fallback;
  const values = raw.split(',').map((item) => item.trim()).filter(Boolean);
  return values.length > 0 ? values : fallback;
}

export function getPublicReviewHours(settings: SiteSettingsMap) {
  return getNumberSetting(settings, 'public_review_hours', 48);
}

export function getMintWindowDays(settings: SiteSettingsMap) {
  return getNumberSetting(settings, 'mint_window_days', 7);
}

export function calculatePremiumScoreFromSettings(
  likesCount: number,
  dislikesCount: number,
  averageRating: number,
  settings: SiteSettingsMap,
  commentsScore = 0
) {
  const likeWeight = getNumberSetting(settings, 'premium_like_weight', 1);
  const dislikeWeight = getNumberSetting(settings, 'premium_dislike_weight', -1);
  const ratingWeight = getNumberSetting(settings, 'premium_rating_weight', 3);
  return likesCount * likeWeight + dislikesCount * dislikeWeight + averageRating * ratingWeight + commentsScore;
}

export function isEligibleForPremium(score: number, settings: SiteSettingsMap) {
  return score >= getNumberSetting(settings, 'premium_min_score', 1000);
}
