import { getBooleanSetting, getSiteSettingsMap } from '@/lib/site-settings';

export async function isCommunityEnabled() {
  const settings = await getSiteSettingsMap();
  return getBooleanSetting(settings, 'community_enabled', false);
}
