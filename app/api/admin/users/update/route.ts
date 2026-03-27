import { UserStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { requireSuperadminApi } from '@/lib/domains/admin';
import { logger } from '@/lib/domains/system';
import { assertSameOrigin, applyRateLimit } from '@/lib/services/request';
import { createAuditLog } from '@/lib/audit';
import { validateEmail, validateUsername } from '@/lib/validators';
import { ADMIN_USER_STATUSES } from '@/types/admin';
import {
  readCheckboxFromFormData,
  readEnumFromFormData,
  readNumberFromFormData,
  readOptionalStringFromFormData,
  readRequiredStringFromFormData,
} from '@/lib/services/request';

const ALLOWED_STATUSES = ADMIN_USER_STATUSES;


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

  const userIdResult = readNumberFromFormData(formData, 'userId', { required: true, integer: true, min: 1 });
  if (!userIdResult.ok) return NextResponse.redirect(new URL('/admin/users?error=missing-fields', request.url));
  const roleIdResult = readNumberFromFormData(formData, 'roleId', { required: true, integer: true, min: 1 });
  if (!roleIdResult.ok) return NextResponse.redirect(new URL('/admin/users?error=missing-fields', request.url));
  const usernameResult = readRequiredStringFromFormData(formData, 'username', { maxLength: 50 });
  if (!usernameResult.ok) return NextResponse.redirect(new URL('/admin/users?error=missing-fields', request.url));
  const emailResult = readRequiredStringFromFormData(formData, 'email', { maxLength: 320 });
  if (!emailResult.ok) return NextResponse.redirect(new URL('/admin/users?error=missing-fields', request.url));
  const statusResult = readEnumFromFormData(formData, 'status', ALLOWED_STATUSES, {
    required: false,
    defaultValue: ALLOWED_STATUSES[0],
    normalize: 'upper',
  });
  if (!statusResult.ok) return NextResponse.redirect(new URL('/admin/users?error=invalid-fields', request.url));

  const userId = userIdResult.data;
  const roleId = roleIdResult.data;
  const username = usernameResult.data;
  const email = emailResult.data.toLowerCase();
  const status = statusResult.data as UserStatus;

  const fullNameResult = readOptionalStringFromFormData(formData, 'fullName', { maxLength: 120 });
  if (!fullNameResult.ok) return NextResponse.redirect(new URL('/admin/users?error=invalid-fields', request.url));
  const phoneNumberResult = readOptionalStringFromFormData(formData, 'phoneNumber', { maxLength: 40 });
  if (!phoneNumberResult.ok) return NextResponse.redirect(new URL('/admin/users?error=invalid-fields', request.url));
  const countryResult = readOptionalStringFromFormData(formData, 'country', { maxLength: 80 });
  if (!countryResult.ok) return NextResponse.redirect(new URL('/admin/users?error=invalid-fields', request.url));
  const headlineResult = readOptionalStringFromFormData(formData, 'headline', { maxLength: 180 });
  if (!headlineResult.ok) return NextResponse.redirect(new URL('/admin/users?error=invalid-fields', request.url));
  const bioResult = readOptionalStringFromFormData(formData, 'bio', { maxLength: 5000 });
  if (!bioResult.ok) return NextResponse.redirect(new URL('/admin/users?error=invalid-fields', request.url));
  const profileImageResult = readOptionalStringFromFormData(formData, 'profileImage', { maxLength: 2000 });
  if (!profileImageResult.ok) return NextResponse.redirect(new URL('/admin/users?error=invalid-fields', request.url));
  const coverImageResult = readOptionalStringFromFormData(formData, 'coverImage', { maxLength: 2000 });
  if (!coverImageResult.ok) return NextResponse.redirect(new URL('/admin/users?error=invalid-fields', request.url));

  const fullName = fullNameResult.data;
  const phoneNumber = phoneNumberResult.data;
  const country = countryResult.data;
  const headline = headlineResult.data;
  const bio = bioResult.data;
  const profileImage = profileImageResult.data;
  const coverImage = coverImageResult.data;
  const showEmailPublic = readCheckboxFromFormData(formData, 'showEmailPublic');
  const showPhonePublic = readCheckboxFromFormData(formData, 'showPhonePublic');
  const showCountryPublic = readCheckboxFromFormData(formData, 'showCountryPublic');
  const canEditCommentsAfterDeadline = readCheckboxFromFormData(formData, 'canEditCommentsAfterDeadline');

  if (!validateUsername(username) || !validateEmail(email)) {
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

  const roleChanged = targetUser.roleId !== roleId;
  const statusChanged = targetUser.status !== status;

  await prisma.user.update({
    where: { id: userId },
    data: {
      username,
      fullName: fullName || null,
      email,
      phoneNumber: phoneNumber || null,
      country: country || null,
      roleId,
      status,
      roleVersion: roleChanged ? { increment: 1 } : undefined,
      sessionVersion: roleChanged || statusChanged ? { increment: 1 } : undefined,
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