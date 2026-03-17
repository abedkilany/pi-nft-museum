
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  const formData = await request.formData();
  const userId = Number(formData.get('userId'));
  const username = String(formData.get('username') || '').trim();
  const fullName = String(formData.get('fullName') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const phoneNumber = String(formData.get('phoneNumber') || '').trim();
  const country = String(formData.get('country') || '').trim();
  const roleId = Number(formData.get('roleId'));
  const status = String(formData.get('status') || 'ACTIVE');
  const headline = String(formData.get('headline') || '').trim();
  const bio = String(formData.get('bio') || '').trim();
  const profileImage = String(formData.get('profileImage') || '').trim();
  const coverImage = String(formData.get('coverImage') || '').trim();
  const showEmailPublic = formData.get('showEmailPublic') === 'on';
  const showPhonePublic = formData.get('showPhonePublic') === 'on';
  const showCountryPublic = formData.get('showCountryPublic') === 'on';
  const canEditCommentsAfterDeadline = formData.get('canEditCommentsAfterDeadline') === 'on';

  if (!userId || !username || !email || !roleId) {
    return NextResponse.redirect(new URL('/admin/users', request.url));
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      username,
      fullName: fullName || null,
      email,
      phoneNumber: phoneNumber || null,
      country: country || null,
      roleId,
      status: status as any,
      headline: headline || null,
      bio: bio || null,
      profileImage: profileImage || null,
      coverImage: coverImage || null,
      showEmailPublic,
      showPhonePublic,
      showCountryPublic,
      canEditCommentsAfterDeadline
    }
  });

  logger.info('Admin updated user', { adminUserId: admin.user.userId, targetUserId: userId });
  return NextResponse.redirect(new URL('/admin/users', request.url));
}
