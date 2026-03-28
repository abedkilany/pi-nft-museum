-- Create lazy-mint identity snapshot tables
CREATE TABLE "ArtworkMintSnapshot" (
  "id" SERIAL NOT NULL,
  "artworkId" INTEGER NOT NULL,
  "ownerUserId" INTEGER NOT NULL,
  "ownerName" TEXT NOT NULL,
  "ownerWalletAddress" TEXT,
  "mintType" TEXT NOT NULL DEFAULT 'LAZY',
  "mintedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "artistId" INTEGER NOT NULL,
  "artistName" TEXT NOT NULL,
  "finalRating" DECIMAL(3,2) NOT NULL,
  "totalVotes" INTEGER NOT NULL DEFAULT 0,
  "metadataVersion" INTEGER NOT NULL DEFAULT 1,
  "tokenId" TEXT,
  "txHash" TEXT,
  "onChainMintedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArtworkMintSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArtworkOwnership" (
  "id" SERIAL NOT NULL,
  "artworkId" INTEGER NOT NULL,
  "currentOwnerId" INTEGER NOT NULL,
  "currentOwnerName" TEXT NOT NULL,
  "currentWalletAddress" TEXT,
  "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArtworkOwnership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArtworkOwnershipHistory" (
  "id" SERIAL NOT NULL,
  "artworkId" INTEGER NOT NULL,
  "fromOwnerId" INTEGER,
  "fromOwnerName" TEXT,
  "toOwnerId" INTEGER NOT NULL,
  "toOwnerName" TEXT NOT NULL,
  "walletAddress" TEXT,
  "eventType" TEXT NOT NULL DEFAULT 'LAZY_MINT',
  "price" DECIMAL(12,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArtworkOwnershipHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArtworkMintSnapshot_artworkId_key" ON "ArtworkMintSnapshot"("artworkId");
CREATE INDEX "ArtworkMintSnapshot_ownerUserId_idx" ON "ArtworkMintSnapshot"("ownerUserId");
CREATE INDEX "ArtworkMintSnapshot_mintType_idx" ON "ArtworkMintSnapshot"("mintType");

CREATE UNIQUE INDEX "ArtworkOwnership_artworkId_key" ON "ArtworkOwnership"("artworkId");
CREATE INDEX "ArtworkOwnership_currentOwnerId_idx" ON "ArtworkOwnership"("currentOwnerId");

CREATE INDEX "ArtworkOwnershipHistory_artworkId_idx" ON "ArtworkOwnershipHistory"("artworkId");
CREATE INDEX "ArtworkOwnershipHistory_fromOwnerId_idx" ON "ArtworkOwnershipHistory"("fromOwnerId");
CREATE INDEX "ArtworkOwnershipHistory_toOwnerId_idx" ON "ArtworkOwnershipHistory"("toOwnerId");
CREATE INDEX "ArtworkOwnershipHistory_eventType_idx" ON "ArtworkOwnershipHistory"("eventType");

ALTER TABLE "ArtworkMintSnapshot" ADD CONSTRAINT "ArtworkMintSnapshot_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArtworkMintSnapshot" ADD CONSTRAINT "ArtworkMintSnapshot_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArtworkOwnership" ADD CONSTRAINT "ArtworkOwnership_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArtworkOwnership" ADD CONSTRAINT "ArtworkOwnership_currentOwnerId_fkey" FOREIGN KEY ("currentOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArtworkOwnershipHistory" ADD CONSTRAINT "ArtworkOwnershipHistory_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArtworkOwnershipHistory" ADD CONSTRAINT "ArtworkOwnershipHistory_fromOwnerId_fkey" FOREIGN KEY ("fromOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ArtworkOwnershipHistory" ADD CONSTRAINT "ArtworkOwnershipHistory_toOwnerId_fkey" FOREIGN KEY ("toOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
