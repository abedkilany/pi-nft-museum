import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin';
import { clearSystemLogs } from '@/lib/system-log';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  await clearSystemLogs();
  logger.info('System logs cleared', { userId: admin.user.userId });
  return NextResponse.redirect(new URL('/admin/system', request.url));
}
