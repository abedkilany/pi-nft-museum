import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin';
import { getMenuItems } from '@/lib/menu';

export async function GET() {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;
  const items = await getMenuItems();
  return NextResponse.json({ ok: true, data: items });
}
