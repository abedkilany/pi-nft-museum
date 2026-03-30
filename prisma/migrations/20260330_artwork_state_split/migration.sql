-- Split artwork state into workflow, mint, listing, visibility, and owner.
ALTER TABLE "Artwork"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TYPE "ArtworkStatus" RENAME TO "ArtworkStatus_old";
CREATE TYPE "ArtworkStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLIC_REVIEW', 'PUBLISHED', 'PREMIUM', 'REJECTED', 'ARCHIVED');
CREATE TYPE "ArtworkMintStatus" AS ENUM ('UNMINTED', 'MINTED');
CREATE TYPE "ArtworkListingType" AS ENUM ('NOT_FOR_SALE', 'FIXED_PRICE', 'AUCTION');
CREATE TYPE "ArtworkVisibility" AS ENUM ('PRIVATE', 'PUBLIC', 'FOLLOWERS');

ALTER TABLE "Artwork"
  ADD COLUMN "currentOwnerUserId" INTEGER,
  ADD COLUMN "mintStatus" "ArtworkMintStatus" NOT NULL DEFAULT 'UNMINTED',
  ADD COLUMN "listingType" "ArtworkListingType" NOT NULL DEFAULT 'NOT_FOR_SALE',
  ADD COLUMN "visibility" "ArtworkVisibility" NOT NULL DEFAULT 'PRIVATE';

ALTER TABLE "Artwork"
  ALTER COLUMN "status" TYPE "ArtworkStatus"
  USING (
    CASE "status"::text
      WHEN 'PENDING' THEN 'PENDING_REVIEW'::"ArtworkStatus"
      WHEN 'APPROVED' THEN 'PUBLIC_REVIEW'::"ArtworkStatus"
      WHEN 'MINTING' THEN 'PUBLIC_REVIEW'::"ArtworkStatus"
      WHEN 'HIDDEN' THEN 'ARCHIVED'::"ArtworkStatus"
      WHEN 'SOLD' THEN 'PUBLISHED'::"ArtworkStatus"
      ELSE "status"::text::"ArtworkStatus"
    END
  );

UPDATE "Artwork"
SET "mintStatus" = CASE WHEN "mintedAt" IS NULL THEN 'UNMINTED'::"ArtworkMintStatus" ELSE 'MINTED'::"ArtworkMintStatus" END,
    "visibility" = CASE
      WHEN "status" IN ('PUBLIC_REVIEW', 'PUBLISHED', 'PREMIUM') THEN 'PUBLIC'::"ArtworkVisibility"
      ELSE 'PRIVATE'::"ArtworkVisibility"
    END,
    "listingType" = CASE
      WHEN "status" IN ('PUBLISHED', 'PREMIUM') THEN 'FIXED_PRICE'::"ArtworkListingType"
      ELSE 'NOT_FOR_SALE'::"ArtworkListingType"
    END,
    "currentOwnerUserId" = COALESCE((SELECT ao."currentOwnerId" FROM "ArtworkOwnership" ao WHERE ao."artworkId" = "Artwork"."id"), "artistUserId");

ALTER TABLE "Artwork"
  ADD CONSTRAINT "Artwork_currentOwnerUserId_fkey" FOREIGN KEY ("currentOwnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Artwork_currentOwnerUserId_idx" ON "Artwork"("currentOwnerUserId");
CREATE INDEX "Artwork_status_visibility_idx" ON "Artwork"("status", "visibility");
CREATE INDEX "Artwork_listingType_visibility_idx" ON "Artwork"("listingType", "visibility");

DROP TYPE "ArtworkStatus_old";


ALTER TABLE "Artwork"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"ArtworkStatus";
