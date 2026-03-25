import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json({
    ok: true,
    url: '/admin-login',
    note: 'Admin access now uses a dedicated username/password login with cookies.',
  });
}
