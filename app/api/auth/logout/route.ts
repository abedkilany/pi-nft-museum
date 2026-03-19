import { NextResponse } from 'next/server';
import { getAuthCookieName } from '@/lib/auth';

export async function POST(request: Request) {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isSecure = forwardedProto === 'https' || process.env.NODE_ENV === 'production';

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: getAuthCookieName(),
    value: '',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'none',
    path: '/',
    maxAge: 0,
  });

  return response;
}
