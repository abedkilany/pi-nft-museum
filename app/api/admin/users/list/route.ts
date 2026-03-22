import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAllowedCountries } from '@/lib/countries';
import { requireSuperadminApi } from '@/lib/admin';

export async function GET() {
  const admin = await requireSuperadminApi();
  if ('error' in admin) return admin.error;

  const [users, roles, countries] = await Promise.all([
    prisma.user.findMany({ include: { role: true, artworks: true }, orderBy: { createdAt: 'desc' } }),
    prisma.role.findMany({ orderBy: { name: 'asc' } }),
    getAllowedCountries(),
  ]);

  return NextResponse.json({ ok: true, data: { users, roles, countries } });
}
