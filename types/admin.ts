import type { ArtworkStatus, ErrorSeverity, ErrorSource, ErrorStatus, PageStatus, UserStatus } from '@prisma/client';

export type AdminArtworkModerationStatus = 'APPROVED' | 'REJECTED' | 'HIDDEN' | 'PENDING';
export const ADMIN_ARTWORK_MODERATION_STATUSES = ['APPROVED', 'REJECTED', 'HIDDEN', 'PENDING'] as const;

export const ADMIN_ERROR_STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'IGNORED'] as const;
export const ADMIN_ERROR_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const ADMIN_ERROR_SOURCES = ['API', 'SERVER', 'CLIENT', 'REACT', 'MIDDLEWARE', 'CRON', 'UNKNOWN'] as const;

export type AdminErrorStatus = (typeof ADMIN_ERROR_STATUSES)[number] & ErrorStatus;
export type AdminErrorSeverity = (typeof ADMIN_ERROR_SEVERITIES)[number] & ErrorSeverity;
export type AdminErrorSource = (typeof ADMIN_ERROR_SOURCES)[number] & ErrorSource;

export const ADMIN_PAGE_STATUSES = ['DRAFT', 'PUBLISHED', 'HIDDEN'] as const;
export type AdminPageStatus = (typeof ADMIN_PAGE_STATUSES)[number] & PageStatus;

export type AdminReportStatus = 'PENDING' | 'RESOLVED' | 'REJECTED' | 'DISMISSED' | 'REVIEWED';
export type AdminCommentAction = 'keep' | 'remove_score_only' | 'hide_and_remove_score' | 'delete';
export type AdminArtworkAction = 'keep' | 'pending' | 'review_again' | 'restore_previous';

export const ADMIN_USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'PENDING', 'BANNED'] as const;
export type AdminUserStatus = (typeof ADMIN_USER_STATUSES)[number] & UserStatus;

export interface AdminPageSectionInput {
  sectionKey?: string;
  sectionType?: string;
  title?: string | null;
  content?: string | null;
  settingsJson?: unknown;
  isEnabled?: boolean;
}

export interface AdminPageUpdateBody {
  pageId?: number | string;
  title?: string;
  slug?: string;
  status?: AdminPageStatus;
  menuLabel?: string | null;
  showInMenu?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  sections?: AdminPageSectionInput[];
}

export interface AdminArtworkStatusBody {
  artworkId?: number | string;
  status?: AdminArtworkModerationStatus;
  reviewNote?: string | null;
}
