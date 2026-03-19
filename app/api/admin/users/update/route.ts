
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperadminApi } from '@/lib/admin';
import { logger } from '@/lib/logger';
import { assertSameOrigin, applyRateLimit } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';
import { validateEmail, validateUsername } from '@/lib/validators';

const ALLOWED_STATUSES = new Set(['ACTIVE', 'SUSPENDED', 'PENDING', 'BANNED']);

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const admin = await requireSuperadminApi();
  if ('error' in admin) return admin.error;

  const rateLimitError = applyRateLimit(request, [admin.user.userId], 'admin-user-update', [
    { limit: 20, windowMs: 10 * 60 * 1000 },
    { limit: 60, windowMs: 60 * 60 * 1000 },
  ]);
  if (rateLimitError) return rateLimitError;

  const formData = await request.formData();
  const userId = Number(formData.get('userId'));
  const username = String(formData.get('username') || '').trim();
  const fullName = String(formData.get('fullName') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const phoneNumber = String(formData.get('phoneNumber') || '').trim();
  const country = String(formData.get('country') || '').trim();
  const roleId = Number(formData.get('roleId'));
  const status = String(formData.get('status') || 'ACTIVE').trim().toUpperCase();
  const headline = String(formData.get('headline') || '').trim();
  const bio = String(formData.get('bio') || '').trim();
  const profileImage = String(formData.get('profileImage') || '').trim();
  const coverImage = String(formData.get('coverImage') || '').trim();
  const showEmailPublic = formData.get('showEmailPublic') === 'on';
  const showPhonePublic = formData.get('showPhonePublic') === 'on';
  const showCountryPublic = formData.get('showCountryPublic') === 'on';
  const canEditCommentsAfterDeadline = formData.get('canEditCommentsAfterDeadline') === 'on';

  if (!userId || !username || !email || !roleId) {
    return NextResponse.redirect(new URL('/admin/users?error=missing-fields', request.url));
  }

  if (!validateUsername(username) || !validateEmail(email) || !ALLOWED_STATUSES.has(status)) {
    return NextResponse.redirect(new URL('/admin/users?error=invalid-fields', request.url));
  }

  const [targetUser, targetRole] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { role: true } }),
    prisma.role.findUnique({ where: { id: roleId } }),
  ]);

  if (!targetUser || !targetRole) {
    return NextResponse.redirect(new URL('/admin/users?error=not-found', request.url));
  }

  if (targetUser.id === admin.user.userId && targetRole.key !== 'superadmin') {
    return NextResponse.redirect(new URL('/admin/users?error=cannot-demote-self', request.url));
  }

  const oldValues = {
    username: targetUser.username,
    email: targetUser.email,
    roleId: targetUser.roleId,
    role: targetUser.role.key,
    status: targetUser.status,
  };

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
      canEditCommentsAfterDeadline,
    }
  });

  await createAuditLog({
    userId: admin.user.userId,
    action: 'ADMIN_USER_UPDATED',
    targetType: 'USER',
    targetId: userId,
    oldValues,
    newValues: { username, email, roleId, role: targetRole.key, status },
  });

  logger.info('Superadmin updated user', { adminUserId: admin.user.userId, targetUserId: userId, role: targetRole.key, status });
  return NextResponse.redirect(new URL('/admin/users?updated=1', request.url));
}
