import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: 'Bootstrap sessions are disabled. Re-authenticate with Pi from the client instead.',
    },
    { status: 410 },
  );
}
