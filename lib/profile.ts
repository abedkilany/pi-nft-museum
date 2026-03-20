import type { Prisma } from '@prisma/client';

export const profileArtworkSelect = {
  id: true,
  title: true,
  description: true,
  imageUrl: true,
  status: true,
  createdAt: true,
  publishedAt: true,
  category: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.ArtworkSelect;

export const privateProfileUserSelect = {
  id: true,
  username: true,
  fullName: true,
  email: true,
  bio: true,
  country: true,
  customCountryName: true,
  phoneNumber: true,
  headline: true,
  profileImage: true,
  coverImage: true,
  websiteUrl: true,
  twitterUrl: true,
  instagramUrl: true,
  showEmailPublic: true,
  showPhonePublic: true,
  showCountryPublic: true,
  role: {
    select: {
      key: true,
      name: true,
    },
  },
  artworks: {
    orderBy: { createdAt: 'desc' },
    take: 6,
    select: profileArtworkSelect,
  },
} satisfies Prisma.UserSelect;

export const publicProfileUserSelect = {
  id: true,
  username: true,
  fullName: true,
  bio: true,
  country: true,
  customCountryName: true,
  headline: true,
  profileImage: true,
  coverImage: true,
  websiteUrl: true,
  twitterUrl: true,
  instagramUrl: true,
  showCountryPublic: true,
  role: {
    select: {
      key: true,
      name: true,
    },
  },
  artworks: {
    where: { status: { in: ['PUBLISHED', 'PREMIUM'] } },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: 12,
    select: profileArtworkSelect,
  },
} satisfies Prisma.UserSelect;

export type PrivateProfileUser = Prisma.UserGetPayload<{ select: typeof privateProfileUserSelect }>;
export type PublicProfileUser = Prisma.UserGetPayload<{ select: typeof publicProfileUserSelect }>;

export function getDisplayName(user: { fullName: string | null; username: string }) {
  return user.fullName?.trim() || user.username;
}

export function getPublicCountry(user: { country: string | null; customCountryName: string | null; showCountryPublic?: boolean | null }) {
  if (user.showCountryPublic === false) return '';
  if (user.country === '__OTHER__') return user.customCountryName?.trim() || '';
  return user.country?.trim() || '';
}

export function getInitials(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return '?';

  const parts = cleaned.split(/\s+/).slice(0, 2);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return parts.map((part) => part.slice(0, 1).toUpperCase()).join('');
}

export function getStatusLabel(status: string) {
  switch (status) {
    case 'PUBLISHED':
      return 'Published';
    case 'PREMIUM':
      return 'Premium';
    case 'PENDING':
      return 'Pending';
    case 'PUBLIC_REVIEW':
      return 'Public review';
    case 'MINTING':
      return 'Minting';
    case 'REJECTED':
      return 'Needs changes';
    case 'APPROVED':
      return 'Approved';
    case 'ARCHIVED':
      return 'Archived';
    case 'HIDDEN':
      return 'Hidden';
    case 'SOLD':
      return 'Sold';
    default:
      return status.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
