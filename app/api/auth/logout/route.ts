import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth-cookie';

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  clearAuthCookies(response, request);
  return response;
}
