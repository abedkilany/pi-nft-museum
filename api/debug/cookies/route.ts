import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    authArchitecture: 'bearer-only',
    cookiesEnabledForAuth: false,
  });
}
