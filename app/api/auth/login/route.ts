
import { NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/services/request';
import type { AuthErrorResponse } from '@/types/auth';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  return NextResponse.json<AuthErrorResponse>(
    { error: 'Password login has been disabled. Please connect with Pi.' },
    { status: 410 }
  );
}