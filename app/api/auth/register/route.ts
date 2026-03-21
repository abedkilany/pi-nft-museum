
import { NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  return NextResponse.json(
    { error: 'Local registration has been disabled. Please connect with Pi to create your account.' },
    { status: 410 }
  );
}