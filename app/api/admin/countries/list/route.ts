import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultCountries } from '@/lib/countries';
import { requireAdminApi } from '@/lib/admin';

export async function GET() {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  await ensureDefaultCountries();
  const countries = await prisma.country.findMany({ orderBy: [{ name: 'asc' }] });
  return NextResponse.json({ ok: true, data: countries });
}
