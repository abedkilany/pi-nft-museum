import { NextResponse } from 'next/server';
import { getAuthDiagnostics, requireDebugAccessApi } from '@/lib/debug-diagnostics';

export async function GET() {
  const auth = await requireDebugAccessApi();
  if ('error' in auth) return auth.error;

  return NextResponse.json({ ok: true, diagnostics: await getAuthDiagnostics() });
}
