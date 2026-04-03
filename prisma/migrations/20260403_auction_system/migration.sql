ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "auctionFailedPaymentCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "auctionSuspendedUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "auctionBanPermanent" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "Auction" (
  "id" SERIAL NOT NULL,
  "artworkId" INTEGER NOT NULL,
  "sellerUserId" INTEGER NOT NULL,
  "winnerUserId" INTEGER,
  "winningBidId" INTEGER,
  "startingPrice" DECIMAL(12,2) NOT NULL,
  "minIncrement" DECIMAL(12,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'LIVE',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "paymentDueAt" TIMESTAMP(3),
  "winningAmount" DECIMAL(12,2),
  "commissionPercent" DECIMAL(5,2),
  "extendedCount" INTEGER NOT NULL DEFAULT 0,
  "settledAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuctionBid" (
  "id" SERIAL NOT NULL,
  "auctionId" INTEGER NOT NULL,
  "bidderUserId" INTEGER NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuctionBid_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Auction_artworkId_status_idx" ON "Auction"("artworkId", "status");
CREATE INDEX IF NOT EXISTS "Auction_sellerUserId_status_idx" ON "Auction"("sellerUserId", "status");
CREATE INDEX IF NOT EXISTS "Auction_winnerUserId_idx" ON "Auction"("winnerUserId");
CREATE INDEX IF NOT EXISTS "Auction_endsAt_idx" ON "Auction"("endsAt");
CREATE INDEX IF NOT EXISTS "AuctionBid_auctionId_createdAt_idx" ON "AuctionBid"("auctionId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuctionBid_auctionId_amount_idx" ON "AuctionBid"("auctionId", "amount");
CREATE INDEX IF NOT EXISTS "AuctionBid_bidderUserId_idx" ON "AuctionBid"("bidderUserId");

DO $$ BEGIN
  ALTER TABLE "Auction" ADD CONSTRAINT "Auction_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Auction" ADD CONSTRAINT "Auction_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Auction" ADD CONSTRAINT "Auction_winnerUserId_fkey" FOREIGN KEY ("winnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AuctionBid" ADD CONSTRAINT "AuctionBid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AuctionBid" ADD CONSTRAINT "AuctionBid_bidderUserId_fkey" FOREIGN KEY ("bidderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
