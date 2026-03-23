import { NextResponse } from 'next/server';
import { getDbDiagnostics, requireDebugAccessApi } from '@/lib/debug-diagnostics';

export async function GET() {
  const auth = await requireDebugAccessApi();
  if ('error' in auth) return auth.error;

  try {
    return NextResponse.json({ ok: true, diagnostics: await getDbDiagnostics() });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to collect database diagnostics.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
