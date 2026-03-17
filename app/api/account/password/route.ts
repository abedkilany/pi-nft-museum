
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Password changes are disabled because this app now authenticates only with Pi.' },
    { status: 410 }
  );
}
