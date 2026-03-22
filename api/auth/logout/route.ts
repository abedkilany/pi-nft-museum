import { NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  return NextResponse.json({ success: true, cleared: 'client-token-only' });
}
