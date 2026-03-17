
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Password login has been disabled. Please connect with Pi.' },
    { status: 410 }
  );
}
