import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { getAllowedCountries } from '@/lib/countries';
import { getPermissionKeysForUserId, PERMISSIONS } from '@/lib/permissions';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const [dbUser, countries, permissions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: currentUser.userId },
      include: { artworks: { orderBy: { createdAt: 'desc' }, take: 5 }, role: true }
    }),
    getAllowedCountries(),
    getPermissionKeysForUserId(currentUser.userId)
  ]);

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: dbUser.id,
      username: dbUser.username,
      fullName: dbUser.fullName || '',
      email: dbUser.email,
      bio: dbUser.bio || '',
      country: dbUser.country || '',
      customCountryName: dbUser.customCountryName || '',
      phoneNumber: dbUser.phoneNumber || '',
      headline: dbUser.headline || '',
      profileImage: dbUser.profileImage || '',
      coverImage: dbUser.coverImage || '',
      websiteUrl: dbUser.websiteUrl || '',
      twitterUrl: dbUser.twitterUrl || '',
      instagramUrl: dbUser.instagramUrl || '',
      showEmailPublic: Boolean(dbUser.showEmailPublic),
      showPhonePublic: Boolean(dbUser.showPhonePublic),
      showCountryPublic: Boolean(dbUser.showCountryPublic),
      piUsername: dbUser.piUsername || '',
      piUid: dbUser.piUid || '',
      piWalletAddress: dbUser.piWalletAddress || '',
      roleName: dbUser.role.name,
      roleKey: dbUser.role.key,
      permissions,
      adminPanelAccess: permissions.includes(PERMISSIONS.adminAccess),
      linkedAt: dbUser.piLinkedAt?.toISOString() || null,
      artworks: dbUser.artworks,
    },
    countries,
  });
}
