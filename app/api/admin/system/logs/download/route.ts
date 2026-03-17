import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin';
import { getSystemLogFileBuffer } from '@/lib/system-log';

export async function GET() {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  const buffer = await getSystemLogFileBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="system-${new Date().toISOString().slice(0, 10)}.log"`
    }
  });
}
