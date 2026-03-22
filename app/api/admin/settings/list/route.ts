import { NextResponse } from 'next/server';
import { SITE_SETTING_DEFINITIONS, getSiteSettingsMap } from '@/lib/site-settings';
import { requireAdminApi } from '@/lib/admin';

export async function GET() {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  const settings = await getSiteSettingsMap();
  return NextResponse.json({ ok: true, data: { definitions: SITE_SETTING_DEFINITIONS, settings } });
}
