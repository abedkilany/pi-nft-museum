import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { logger } from '@/lib/logger';
import { saveUploadedImage } from '@/lib/uploads';
import { getSiteSettingsMap, getStringSetting } from '@/lib/site-settings';
import { isMemberRole } from '@/lib/roles';
import { clampNumber, validateArtworkInput } from '@/lib/validators';
import { assertSameOrigin } from '@/lib/security';

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
    if (!isMemberRole(currentUser.role)) return NextResponse.json({ error: 'Visitors cannot upload artworks. Connect with Pi first.' }, { status: 403 });

    const settings = await getSiteSettingsMap();
    const formData = await request.formData();
    const title = String(formData.get('title') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const category = String(formData.get('category') || '').trim();
    const imageUrl = String(formData.get('imageUrl') || '').trim();
    const basePrice = Number(formData.get('basePrice') || formData.get('price') || 0);
    const discountPercent = clampNumber(Number(formData.get('discountPercent') || 0), 0, 100);
    const requestedStatus = String(formData.get('status') || 'DRAFT').trim().toUpperCase();
    const status = requestedStatus === 'PENDING' ? 'PENDING' : 'DRAFT';
    const imageFile = formData.get('imageFile');

    if (!title || !description || !basePrice) return NextResponse.json({ error: 'Please complete all required fields.' }, { status: 400 });
    const validation = validateArtworkInput({ title, description, category, imageUrl, price: basePrice });
    if (!validation.ok) return NextResponse.json({ error: validation.errors[0] }, { status: 400 });
    let finalImageUrl = imageUrl || '';
    if (imageFile instanceof File && imageFile.size > 0) finalImageUrl = (await saveUploadedImage(imageFile)) || '';
    if (!finalImageUrl) finalImageUrl = getStringSetting(settings, 'placeholder_artwork_image_url', '/placeholder-artwork.svg');

    const finalPrice = Number((basePrice * (1 - discountPercent / 100)).toFixed(2));
    const baseSlug = slugify(title);
    const uniqueSlug = `${baseSlug}-${Date.now()}`;
    let categoryRecord = null;
    if (category) {
      const categorySlug = slugify(category);
      categoryRecord = await prisma.artworkCategory.upsert({ where: { slug: categorySlug }, update: { name: category }, create: { name: category, slug: categorySlug, description: `${category} artworks` } });
    }

    const artwork = await prisma.artwork.create({
      data: {
        artistUserId: currentUser.userId,
        categoryId: categoryRecord?.id || null,
        title,
        slug: uniqueSlug,
        description,
        imageUrl: finalImageUrl,
        status: status as any,
        basePrice,
        discountPercent,
        price: finalPrice,
        currency: getStringSetting(settings, 'default_currency', 'PI')
      }
    });

    logger.info('Artwork created', { artworkId: artwork.id, userId: currentUser.userId, status, basePrice, discountPercent, finalPrice });
    return NextResponse.json({ ok: true, artwork });
  } catch (error) {
    logger.error('Failed to create artwork', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}