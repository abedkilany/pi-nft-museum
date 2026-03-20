
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { logger } from '@/lib/logger';
import {
  normalizePhoneNumber,
  validateOptionalText,
  validateOptionalUrl,
} from '@/lib/validators';
import { saveUploadedImage } from '@/lib/uploads';
import { applyRateLimit, assertSameOrigin } from '@/lib/security';

function toBoolean(value: FormDataEntryValue | null) {
  return String(value || '') === 'true';
}

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const rateLimitError = applyRateLimit(request, [currentUser.userId], 'account-profile-update', [
      { limit: 10, windowMs: 60 * 1000 },
      { limit: 40, windowMs: 60 * 60 * 1000 },
    ]);
    if (rateLimitError) return rateLimitError;

    const formData = await request.formData();
    const fullName = String(formData.get('fullName') || '').trim();
    const bio = String(formData.get('bio') || '').trim();
    const country = String(formData.get('country') || '').trim();
    const customCountryName = String(formData.get('customCountryName') || '').trim();
    const phoneNumber = normalizePhoneNumber(formData.get('phoneNumber'));
    const headline = String(formData.get('headline') || '').trim();
    const profileImageUrl = String(formData.get('profileImage') || '').trim();
    const coverImageUrl = String(formData.get('coverImage') || '').trim();
    const websiteUrl = String(formData.get('websiteUrl') || '').trim();
    const twitterUrl = String(formData.get('twitterUrl') || '').trim();
    const instagramUrl = String(formData.get('instagramUrl') || '').trim();
    const showEmailPublic = false;
    const showPhonePublic = toBoolean(formData.get('showPhonePublic'));
    const showCountryPublic = toBoolean(formData.get('showCountryPublic'));
    const profileImageFile = formData.get('profileImageFile');
    const coverImageFile = formData.get('coverImageFile');

    const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    for (const validationError of [
      validateOptionalText(fullName, 120, 'Full name'),
      validateOptionalText(headline, 160, 'Headline'),
      validateOptionalText(customCountryName, 100, 'Custom country name'),
      validateOptionalText(bio, 5000, 'Bio'),
      validateOptionalUrl(profileImageUrl, 'Profile image URL'),
      validateOptionalUrl(coverImageUrl, 'Cover image URL'),
      validateOptionalUrl(websiteUrl, 'Website URL'),
      validateOptionalUrl(twitterUrl, 'Twitter URL'),
      validateOptionalUrl(instagramUrl, 'Instagram URL'),
    ]) {
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        id: { not: currentUser.userId },
        ...(phoneNumber ? { phoneNumber } : {}),
      },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json({ error: 'Phone number is already in use.' }, { status: 400 });
    }

    let profileImage = profileImageUrl || user.profileImage || null;
    let coverImage = coverImageUrl || user.coverImage || null;
    if (profileImageFile instanceof File && profileImageFile.size > 0) profileImage = await saveUploadedImage(profileImageFile);
    if (coverImageFile instanceof File && coverImageFile.size > 0) coverImage = await saveUploadedImage(coverImageFile);

    await prisma.user.update({
      where: { id: currentUser.userId },
      data: {
        fullName: fullName || null,
        bio: bio || null,
        country: country || null,
        customCountryName: country === '__OTHER__' ? (customCountryName || null) : null,
        phoneNumber: phoneNumber || null,
        headline: headline || null,
        profileImage,
        coverImage,
        websiteUrl: websiteUrl || null,
        twitterUrl: twitterUrl || null,
        instagramUrl: instagramUrl || null,
        showEmailPublic,
        showPhonePublic,
        showCountryPublic
      }
    });
    logger.info('Profile updated', { userId: currentUser.userId });
    return NextResponse.json({ ok: true, message: 'Profile updated successfully.' });
  } catch (error) {
    logger.error('Profile update failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
