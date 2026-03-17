import { getNumberSetting, getSiteSettingsMap, getStringSetting } from '@/lib/site-settings';

export function getCsvSetting(
  settings: Record<string, string>,
  key: string,
  fallback: string[]
) {
  const raw = String(settings[key] ?? '').trim();
  if (!raw) return fallback;

  const values = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return values.length > 0 ? values : fallback;
}

export function formatArtworkPrice(price: number, settings: Record<string, string>) {
  const currency = getStringSetting(settings, 'default_currency', 'PI');
  return `${Number(price).toFixed(2)} ${currency}`;
}

export async function getAppConfig() {
  const settings = await getSiteSettingsMap();

  return {
    settings,
    siteName: getStringSetting(settings, 'site_name', 'Pi NFT Museum'),
    siteTagline: getStringSetting(
      settings,
      'site_tagline',
      'A digital museum for NFT artworks on Pi Network'
    ),
    currency: getStringSetting(settings, 'default_currency', 'PI'),
    heroEyebrow: getStringSetting(settings, 'hero_eyebrow', 'Built for Pi Network'),
    heroTitle: getStringSetting(
      settings,
      'hero_title',
      'Discover, showcase, and prepare digital art for Pi-powered trading.'
    ),
    heroDescription: getStringSetting(
      settings,
      'hero_description',
      'Explore digital artworks, review submissions, mint approved pieces, and grow a premium museum experience managed from site settings.'
    ),
    homeGalleryKicker: getStringSetting(settings, 'home_gallery_kicker', 'Featured collection'),
    homeGalleryTitle: getStringSetting(settings, 'home_gallery_title', 'Curated artwork gallery'),
    homeGalleryDescription: getStringSetting(
      settings,
      'home_gallery_description',
      'Featured artworks shown on the homepage are controlled by site settings instead of hardcoded page logic.'
    ),
    homeFeaturedLimit: getNumberSetting(settings, 'home_featured_limit', 6),
    homeFeaturedStatuses: getCsvSetting(settings, 'home_featured_statuses', ['PUBLISHED', 'PREMIUM']),
    artistPublicStatuses: getCsvSetting(settings, 'artist_public_statuses', ['PUBLISHED', 'PREMIUM']),
    profileRecentLimit: getNumberSetting(settings, 'profile_recent_limit', 5),
    publicReviewHours: getNumberSetting(settings, 'public_review_hours', 48)
  };
}
