import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth-cookie';

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/', request.url));
  clearAuthCookies(response, request);
  return response;
}
