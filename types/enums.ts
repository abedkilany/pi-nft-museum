// Central enum definitions shared across app code.

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
  BANNED = 'BANNED',
}

export enum ArtworkStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PUBLIC_REVIEW = 'PUBLIC_REVIEW',
  PUBLISHED = 'PUBLISHED',
  PREMIUM = 'PREMIUM',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export enum ArtworkMintStatus {
  UNMINTED = 'UNMINTED',
  MINTED = 'MINTED',
}

export enum ArtworkListingType {
  NOT_FOR_SALE = 'NOT_FOR_SALE',
  FIXED_PRICE = 'FIXED_PRICE',
  AUCTION = 'AUCTION',
}

export enum ArtworkVisibility {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
  FOLLOWERS = 'FOLLOWERS',
}

export enum PageStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  HIDDEN = 'HIDDEN',
}
