import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { ArtworkListingType, ArtworkMintStatus, ArtworkStatus, ArtworkVisibility } from '@/types/enums';
import { getNumberSetting, getSiteSettingsMap, type SiteSettingsMap } from '@/lib/site-settings';
import type { SessionUser } from '@/lib/auth';

export const AUCTION_STATUS = {
  SCHEDULED: 'SCHEDULED',
  LIVE: 'LIVE',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  SETTLED: 'SETTLED',
  ENDED_NO_BIDS: 'ENDED_NO_BIDS',
  ENDED_UNPAID: 'ENDED_UNPAID',
  CANCELLED: 'CANCELLED',
} as const;

export const AUCTION_BID_STATUS = {
  ACTIVE: 'ACTIVE',
  OUTBID: 'OUTBID',
  DEFAULTED: 'DEFAULTED',
  WON: 'WON',
  PAID: 'PAID',
} as const;

export type AuctionSettings = {
  defaultDurationHours: number;
  paymentWindowHours: number;
  minIncrement: number;
  antiSnipeWindowMinutes: number;
  antiSnipeExtendMinutes: number;
  antiSnipeMaxExtensions: number;
  commissionPercent: number;
  allowSecondChance: boolean;
};

export async function getAuctionSettings(settings?: SiteSettingsMap): Promise<AuctionSettings> {
  const resolved = settings ?? await getSiteSettingsMap();
  return {
    defaultDurationHours: Math.max(1, getNumberSetting(resolved, 'auction_default_duration_hours', 72)),
    paymentWindowHours: Math.max(1, getNumberSetting(resolved, 'auction_payment_window_hours', 24)),
    minIncrement: Math.max(0.01, getNumberSetting(resolved, 'auction_min_increment', 1)),
    antiSnipeWindowMinutes: Math.max(0, getNumberSetting(resolved, 'auction_anti_snipe_window_minutes', 2)),
    antiSnipeExtendMinutes: Math.max(0, getNumberSetting(resolved, 'auction_anti_snipe_extend_minutes', 2)),
    antiSnipeMaxExtensions: Math.max(0, Math.floor(getNumberSetting(resolved, 'auction_anti_snipe_max_extensions', 10))),
    commissionPercent: Math.max(0, getNumberSetting(resolved, 'auction_commission_percent', 5)),
    allowSecondChance: getNumberSetting(resolved, 'auction_second_bidder_fallback_enabled', 1) !== 0,
  };
}

export function getAuctionEligibilityReason(artwork: {
  status: string;
  mintStatus: string | null;
  visibility: string | null;
  listingType?: string | null;
}) {
  if (![ArtworkStatus.PUBLISHED, ArtworkStatus.PREMIUM].includes(artwork.status as ArtworkStatus)) {
    return 'Only published or premium artworks can run auctions.';
  }
  if (![ArtworkMintStatus.LAZY_MINTED, ArtworkMintStatus.MINTED].includes(String(artwork.mintStatus) as ArtworkMintStatus)) {
    return 'The artwork must be lazy minted or fully minted before auction listing.';
  }
  if (String(artwork.visibility || ArtworkVisibility.PRIVATE) !== ArtworkVisibility.PUBLIC) {
    return 'Auction artworks must be publicly visible.';
  }
  if (String(artwork.listingType || ArtworkListingType.NOT_FOR_SALE) !== ArtworkListingType.AUCTION) {
    return 'Artwork is not listed as an auction.';
  }
  return null;
}

export function getAuctionPenaltyState(user: {
  auctionBanPermanent?: boolean | null;
  auctionSuspendedUntil?: Date | null;
  auctionFailedPaymentCount?: number | null;
}) {
  const now = new Date();
  const suspendedUntil = user.auctionSuspendedUntil ?? null;
  const permanentlyBanned = Boolean(user.auctionBanPermanent);
  const temporarilySuspended = Boolean(suspendedUntil && suspendedUntil > now);
  return {
    permanentlyBanned,
    temporarilySuspended,
    suspendedUntil,
    failedPaymentCount: Number(user.auctionFailedPaymentCount ?? 0),
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function nextMinimumBid(auction: { startingPrice: Prisma.Decimal | number | string; minIncrement: Prisma.Decimal | number | string; bids?: Array<{ amount: Prisma.Decimal | number | string }> }) {
  const highest = auction.bids && auction.bids.length > 0
    ? Math.max(...auction.bids.map((bid) => Number(bid.amount)))
    : Number(auction.startingPrice);
  const hasBids = Boolean(auction.bids && auction.bids.length > 0);
  return hasBids ? roundCurrency(highest + Number(auction.minIncrement)) : roundCurrency(Number(auction.startingPrice));
}

export async function applyAuctionFailurePenalty(tx: Prisma.TransactionClient, userId: number) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { auctionFailedPaymentCount: true, auctionBanPermanent: true },
  });
  if (!user) return;
  const nextCount = Number(user.auctionFailedPaymentCount ?? 0) + 1;
  await tx.user.update({
    where: { id: userId },
    data: nextCount >= 2
      ? {
          auctionFailedPaymentCount: nextCount,
          auctionBanPermanent: true,
          auctionSuspendedUntil: null,
        }
      : {
          auctionFailedPaymentCount: nextCount,
          auctionSuspendedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
  });
}

async function pickNextEligibleBid(tx: Prisma.TransactionClient, auctionId: number) {
  return tx.auctionBid.findFirst({
    where: {
      auctionId,
      status: { in: [AUCTION_BID_STATUS.ACTIVE, AUCTION_BID_STATUS.OUTBID] },
    },
    orderBy: [{ amount: 'desc' }, { createdAt: 'asc' }],
    include: {
      bidder: {
        select: {
          id: true,
          username: true,
          auctionBanPermanent: true,
          auctionSuspendedUntil: true,
        },
      },
    },
  });
}

export async function syncAuctionState(auctionId: number, settings?: AuctionSettings) {
  const resolvedSettings = settings ?? await getAuctionSettings();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({
      where: { id: auctionId },
      include: {
        artwork: {
          select: {
            id: true,
            title: true,
            listingType: true,
            visibility: true,
            status: true,
            mintStatus: true,
            artistUserId: true,
            currentOwnerUserId: true,
            imageUrl: true,
            slug: true,
            currency: true,
          },
        },
        bids: {
          orderBy: [{ amount: 'desc' }, { createdAt: 'asc' }],
          include: {
            bidder: {
              select: {
                id: true,
                username: true,
                auctionBanPermanent: true,
                auctionSuspendedUntil: true,
              },
            },
          },
        },
      },
    });

    if (!auction) return null;

    if (auction.status === AUCTION_STATUS.SCHEDULED && auction.startsAt <= now) {
      await tx.auction.update({ where: { id: auction.id }, data: { status: AUCTION_STATUS.LIVE } });
      auction.status = AUCTION_STATUS.LIVE;
    }

    if (auction.status === AUCTION_STATUS.LIVE && auction.endsAt <= now) {
      const topBid = auction.bids.find((bid) => {
        const penalty = getAuctionPenaltyState(bid.bidder);
        return !penalty.permanentlyBanned && !penalty.temporarilySuspended;
      });
      if (!topBid) {
        await tx.auction.update({ where: { id: auction.id }, data: { status: AUCTION_STATUS.ENDED_NO_BIDS, paymentDueAt: null, winnerUserId: null, winningBidId: null, winningAmount: null } });
        auction.status = AUCTION_STATUS.ENDED_NO_BIDS;
      } else {
        await tx.auction.update({
          where: { id: auction.id },
          data: {
            status: AUCTION_STATUS.PAYMENT_PENDING,
            winnerUserId: topBid.bidderUserId,
            winningBidId: topBid.id,
            winningAmount: topBid.amount,
            paymentDueAt: new Date(now.getTime() + resolvedSettings.paymentWindowHours * 60 * 60 * 1000),
          },
        });
        await tx.auctionBid.updateMany({ where: { auctionId: auction.id }, data: { status: AUCTION_BID_STATUS.OUTBID } });
        await tx.auctionBid.update({ where: { id: topBid.id }, data: { status: AUCTION_BID_STATUS.WON } });
        auction.status = AUCTION_STATUS.PAYMENT_PENDING;
      }
    }

    if (auction.status === AUCTION_STATUS.PAYMENT_PENDING && auction.paymentDueAt && auction.paymentDueAt <= now) {
      if (auction.winnerUserId) {
        await applyAuctionFailurePenalty(tx, auction.winnerUserId);
      }
      if (auction.winningBidId) {
        await tx.auctionBid.update({ where: { id: auction.winningBidId }, data: { status: AUCTION_BID_STATUS.DEFAULTED } }).catch(() => null);
      }

      if (resolvedSettings.allowSecondChance) {
        const nextBid = await pickNextEligibleBid(tx, auction.id);
        if (nextBid) {
          await tx.auction.update({
            where: { id: auction.id },
            data: {
              status: AUCTION_STATUS.PAYMENT_PENDING,
              winnerUserId: nextBid.bidderUserId,
              winningBidId: nextBid.id,
              winningAmount: nextBid.amount,
              paymentDueAt: new Date(now.getTime() + resolvedSettings.paymentWindowHours * 60 * 60 * 1000),
            },
          });
          await tx.auctionBid.update({ where: { id: nextBid.id }, data: { status: AUCTION_BID_STATUS.WON } });
        } else {
          await tx.auction.update({ where: { id: auction.id }, data: { status: AUCTION_STATUS.ENDED_UNPAID, paymentDueAt: null } });
        }
      } else {
        await tx.auction.update({ where: { id: auction.id }, data: { status: AUCTION_STATUS.ENDED_UNPAID, paymentDueAt: null } });
      }
    }

    return tx.auction.findUnique({
      where: { id: auction.id },
      include: {
        artwork: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            slug: true,
            currency: true,
            status: true,
            mintStatus: true,
            visibility: true,
            listingType: true,
          },
        },
        winner: { select: { id: true, username: true } },
        bids: {
          orderBy: [{ amount: 'desc' }, { createdAt: 'asc' }],
          include: { bidder: { select: { id: true, username: true } } },
        },
      },
    });
  });
}

export async function getCurrentArtworkAuction(artworkId: number) {
  const auction = await prisma.auction.findFirst({
    where: { artworkId, status: { in: [AUCTION_STATUS.SCHEDULED, AUCTION_STATUS.LIVE, AUCTION_STATUS.PAYMENT_PENDING] } },
    orderBy: [{ createdAt: 'desc' }],
    include: {
      artwork: { select: { id: true, title: true, imageUrl: true, slug: true, currency: true, status: true, mintStatus: true, visibility: true, listingType: true } },
      winner: { select: { id: true, username: true } },
      bids: { orderBy: [{ amount: 'desc' }, { createdAt: 'asc' }], include: { bidder: { select: { id: true, username: true } } } },
    },
  });
  if (!auction) return null;
  return syncAuctionState(auction.id);
}

export type SerializedAuction = {
  id: number;
  artworkId: number;
  artworkTitle: string;
  artworkImageUrl: string;
  artworkSlug: string;
  currency: string;
  status: string;
  startingPrice: number;
  minIncrement: number;
  currentBid: number | null;
  nextMinimumBid: number;
  bidsCount: number;
  startsAt: string;
  endsAt: string;
  paymentDueAt: string | null;
  winnerUserId: number | null;
  winnerUsername: string | null;
  winningAmount: number | null;
  commissionPercent: number;
  sellerUserId: number;
  bidHistory: Array<{ id: number; amount: number; bidderUserId: number; bidderUsername: string; createdAt: string; status: string }>;
};

export function serializeAuction(auction: Awaited<ReturnType<typeof syncAuctionState>> | Awaited<ReturnType<typeof getCurrentArtworkAuction>>): SerializedAuction | null {
  if (!auction) return null;
  const bids = auction.bids ?? [];
  const currentBid = bids.length > 0 ? Number(bids[0].amount) : null;
  return {
    id: auction.id,
    artworkId: auction.artworkId,
    artworkTitle: auction.artwork?.title ?? '',
    artworkImageUrl: auction.artwork?.imageUrl ?? '',
    artworkSlug: auction.artwork?.slug ?? '',
    currency: auction.artwork?.currency ?? 'PI',
    status: auction.status,
    startingPrice: Number(auction.startingPrice),
    minIncrement: Number(auction.minIncrement),
    currentBid,
    nextMinimumBid: nextMinimumBid({ startingPrice: auction.startingPrice, minIncrement: auction.minIncrement, bids }),
    bidsCount: bids.length,
    startsAt: auction.startsAt.toISOString(),
    endsAt: auction.endsAt.toISOString(),
    paymentDueAt: auction.paymentDueAt ? auction.paymentDueAt.toISOString() : null,
    winnerUserId: auction.winnerUserId ?? null,
    winnerUsername: auction.winner?.username ?? null,
    winningAmount: auction.winningAmount == null ? null : Number(auction.winningAmount),
    commissionPercent: Number(auction.commissionPercent ?? 0),
    sellerUserId: auction.sellerUserId,
    bidHistory: bids.slice(0, 10).map((bid) => ({
      id: bid.id,
      amount: Number(bid.amount),
      bidderUserId: bid.bidderUserId,
      bidderUsername: bid.bidder?.username ?? 'Unknown',
      createdAt: bid.createdAt.toISOString(),
      status: bid.status,
    })),
  };
}

export function buildAuctionViewerState(auction: SerializedAuction | null, currentUser: SessionUser | null, penalty: { permanentlyBanned: boolean; temporarilySuspended: boolean; suspendedUntil: Date | null } | null) {
  if (!auction) {
    return {
      canBid: false,
      canPay: false,
      reason: 'Auction is not available.',
      myHighestBid: null as number | null,
    };
  }
  if (!currentUser) {
    return {
      canBid: false,
      canPay: false,
      reason: 'Connect with Pi first to join the auction.',
      myHighestBid: null as number | null,
    };
  }
  if (penalty?.permanentlyBanned) {
    return { canBid: false, canPay: false, reason: 'Your account is permanently blocked from auctions because of repeated non-payment.', myHighestBid: null as number | null };
  }
  if (penalty?.temporarilySuspended) {
    return { canBid: false, canPay: false, reason: `Auction access is suspended until ${penalty.suspendedUntil?.toLocaleString()}.`, myHighestBid: null as number | null };
  }
  if (auction.sellerUserId === currentUser.userId) {
    return { canBid: false, canPay: false, reason: 'You cannot bid on your own artwork.', myHighestBid: null as number | null };
  }
  if (auction.status === AUCTION_STATUS.PAYMENT_PENDING && auction.winnerUserId === currentUser.userId) {
    return { canBid: false, canPay: true, reason: null, myHighestBid: auction.winningAmount };
  }
  if (auction.status !== AUCTION_STATUS.LIVE && auction.status !== AUCTION_STATUS.SCHEDULED) {
    return { canBid: false, canPay: false, reason: 'This auction is no longer accepting bids.', myHighestBid: null as number | null };
  }
  if (auction.status === AUCTION_STATUS.SCHEDULED) {
    return { canBid: false, canPay: false, reason: 'This auction has not started yet.', myHighestBid: null as number | null };
  }
  return { canBid: true, canPay: false, reason: null, myHighestBid: null as number | null };
}
