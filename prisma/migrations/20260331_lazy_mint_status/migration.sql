-- Rebuild ArtworkMintStatus enum to safely introduce LAZY_MINTED
-- and migrate existing MINTED rows to LAZY_MINTED in one migration.

ALTER TYPE "ArtworkMintStatus" RENAME TO "ArtworkMintStatus_old";

CREATE TYPE "ArtworkMintStatus" AS ENUM ('UNMINTED', 'LAZY_MINTED', 'MINTED');

ALTER TABLE "Artwork"
  ALTER COLUMN "mintStatus" DROP DEFAULT;

ALTER TABLE "Artwork"
  ALTER COLUMN "mintStatus" TYPE "ArtworkMintStatus"
  USING (
    CASE
      WHEN "mintStatus"::text = 'MINTED' THEN 'LAZY_MINTED'
      WHEN "mintStatus"::text = 'UNMINTED' THEN 'UNMINTED'
      ELSE "mintStatus"::text
    END
  )::"ArtworkMintStatus";

ALTER TABLE "Artwork"
  ALTER COLUMN "mintStatus" SET DEFAULT 'UNMINTED';

DROP TYPE "ArtworkMintStatus_old";