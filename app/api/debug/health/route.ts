import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDeploymentFingerprint, getRequestSnapshot, requireDebugAccessApi } from '@/lib/debug-diagnostics';

export async function GET() {
  const auth = await requireDebugAccessApi();
  if ('error' in auth) return auth.error;

  let databaseOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseOk = true;
  } catch {
    databaseOk = false;
  }

  return NextResponse.json({
    ok: true,
    deployment: getDeploymentFingerprint(),
    request: getRequestSnapshot(),
    database: { ok: databaseOk },
  });
}
