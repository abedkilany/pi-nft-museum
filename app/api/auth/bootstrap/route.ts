import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const returnToParam = request.nextUrl.searchParams.get('returnTo') || '/';
  const returnTo = returnToParam.startsWith('/') ? returnToParam : '/';
  return NextResponse.redirect(new URL(returnTo, request.url));
}
