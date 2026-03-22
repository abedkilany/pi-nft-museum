
import { NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  return NextResponse.json(
    { error: 'Password login has been disabled. Please connect with Pi.' },
    { status: 410 }
  );
}