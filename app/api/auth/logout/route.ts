import { NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/security';
import { clearAuthCookies } from '@/lib/auth-cookie';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const response = NextResponse.json({ success: true });

  clearAuthCookies(response, request);

  return response;
}
