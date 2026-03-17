
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Local registration has been disabled. Please connect with Pi to create your account.' },
    { status: 410 }
  );
}
