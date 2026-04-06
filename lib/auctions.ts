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
  firstNonPaymentBanDays: number;
  permanentBanAfterFailures: number;
};

export type AuctionViewerState = {
  canBid: boolean;
  canPay: boolean;
  reason: string | null;
  myHighestBid: number | null;
  isHighestBidder: boolean;
  isOutbid: boolean;
  isWinner: boolean;
};

const auctionInclude = {
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
      artistUserId: true,
      currentOwnerUserId: true,
    },
  },
  winner: { select: { id: true, username: true } },
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
} satisfies Prisma.AuctionInclude;

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
    firstNonPaymentBanDays: Math.max(1, Math.floor(getNumberSetting(resolved, 'auction_first_non_payment_ban_days', 30))),
    permanentBanAfterFailures: Math.max(2, Math.floor(getNumberSetting(resolved, 'auction_permanent_ban_after_failures', 2))),
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

export function getHighestBidAmount(auction: { bids?: Array<{ amount: Prisma.Decimal | number | string }> }) {
  if (!auction.bids?.length) return null;
  return Math.max(...auction.bids.map((bid) => Number(bid.amount)));
}

function nextMinimumBid(auction: { startingPrice: Prisma.Decimal | number | string; minIncrement: Prisma.Decimal | number | string; bids?: Array<{ amount: Prisma.Decimal | number | string }> }) {
  const highest = getHighestBidAmount(auction);
  return highest == null ? roundCurrency(Number(auction.startingPrice)) : roundCurrency(highest + Number(auction.minIncrement));
}

export async function applyAuctionFailurePenalty(tx: Prisma.TransactionClient, userId: number, settings: AuctionSettings) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { auctionFailedPaymentCount: true },
  });
  if (!user) return;
  const nextCount = Number(user.auctionFailedPaymentCount ?? 0) + 1;
  await tx.user.update({
    where: { id: userId },
    data: nextCount >= settings.permanentBanAfterFailures
      ? {
          auctionFailedPaymentCount: nextCount,
          auctionBanPermanent: true,
          auctionSuspendedUntil: null,
        }
      : {
          auctionFailedPaymentCount: nextCount,
          auctionSuspendedUntil: new Date(Date.now() + settings.firstNonPaymentBanDays * 24 * 60 * 60 * 1000),
        },
  });
}

async function pickNextEligibleBid(tx: Prisma.TransactionClient, auctionId: number) {
  const candidates = await tx.auctionBid.findMany({
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

  return candidates.find((candidate) => {
    const penalty = getAuctionPenaltyState(candidate.bidder);
    return !penalty.permanentlyBanned && !penalty.temporarilySuspended;
  }) ?? null;
}

async function fetchAuctionById(tx: Prisma.TransactionClient | typeof prisma, auctionId: number) {
  return tx.auction.findUnique({
    where: { id: auctionId },
    include: auctionInclude,
  });
}

async function fetchCurrentArtworkAuction(tx: Prisma.TransactionClient | typeof prisma, artworkId: number) {
  return tx.auction.findFirst({
    where: { artworkId, status: { in: [AUCTION_STATUS.SCHEDULED, AUCTION_STATUS.LIVE, AUCTION_STATUS.PAYMENT_PENDING] } },
    orderBy: [{ createdAt: 'desc' }],
    include: auctionInclude,
  });
}

async function advanceAuctionStateInTransaction(tx: Prisma.TransactionClient, auctionId: number, settings: AuctionSettings) {
  await tx.$queryRaw`SELECT id FROM "Auction" WHERE id = ${auctionId} FOR UPDATE`;
  const auction = await fetchAuctionById(tx, auctionId);
  if (!auction) return null;

  const now = new Date();

  if (auction.status === AUCTION_STATUS.SCHEDULED && auction.startsAt <= now) {
    await tx.auction.update({ where: { id: auction.id }, data: { status: AUCTION_STATUS.LIVE } });
  }

  const refreshedAfterStart = await fetchAuctionById(tx, auctionId);
  if (!refreshedAfterStart) return null;

  if (refreshedAfterStart.status === AUCTION_STATUS.LIVE && refreshedAfterStart.endsAt <= now) {
    const topBid = refreshedAfterStart.bids.find((bid) => {
      const penalty = getAuctionPenaltyState(bid.bidder);
      return !penalty.permanentlyBanned && !penalty.temporarilySuspended;
    });

    if (!topBid) {
      await tx.auction.update({
        where: { id: refreshedAfterStart.id },
        data: {
          status: AUCTION_STATUS.ENDED_NO_BIDS,
          paymentDueAt: null,
          winnerUserId: null,
          winningBidId: null,
          winningAmount: null,
        },
      });
    } else {
      await tx.auction.update({
        where: { id: refreshedAfterStart.id },
        data: {
          status: AUCTION_STATUS.PAYMENT_PENDING,
          winnerUserId: topBid.bidderUserId,
          winningBidId: topBid.id,
          winningAmount: topBid.amount,
          paymentDueAt: new Date(now.getTime() + settings.paymentWindowHours * 60 * 60 * 1000),
        },
      });
      await tx.auctionBid.updateMany({ where: { auctionId: refreshedAfterStart.id }, data: { status: AUCTION_BID_STATUS.OUTBID } });
      await tx.auctionBid.update({ where: { id: topBid.id }, data: { status: AUCTION_BID_STATUS.WON } });
    }
  }

  const refreshedAfterEnd = await fetchAuctionById(tx, auctionId);
  if (!refreshedAfterEnd) return null;

  if (refreshedAfterEnd.status === AUCTION_STATUS.PAYMENT_PENDING && refreshedAfterEnd.paymentDueAt && refreshedAfterEnd.paymentDueAt <= now) {
    if (refreshedAfterEnd.winnerUserId) {
      await applyAuctionFailurePenalty(tx, refreshedAfterEnd.winnerUserId, settings);
    }
    if (refreshedAfterEnd.winningBidId) {
      await tx.auctionBid.update({ where: { id: refreshedAfterEnd.winningBidId }, data: { status: AUCTION_BID_STATUS.DEFAULTED } }).catch(() => null);
    }

    if (settings.allowSecondChance) {
      const nextBid = await pickNextEligibleBid(tx, refreshedAfterEnd.id);
      if (nextBid) {
        await tx.auction.update({
          where: { id: refreshedAfterEnd.id },
          data: {
            status: AUCTION_STATUS.PAYMENT_PENDING,
            winnerUserId: nextBid.bidderUserId,
            winningBidId: nextBid.id,
            winningAmount: nextBid.amount,
            paymentDueAt: new Date(now.getTime() + settings.paymentWindowHours * 60 * 60 * 1000),
          },
        });
        await tx.auctionBid.update({ where: { id: nextBid.id }, data: { status: AUCTION_BID_STATUS.WON } });
      } else {
        await tx.auction.update({ where: { id: refreshedAfterEnd.id }, data: { status: AUCTION_STATUS.ENDED_UNPAID, paymentDueAt: null, winnerUserId: null, winningBidId: null } });
      }
    } else {
      await tx.auction.update({ where: { id: refreshedAfterEnd.id }, data: { status: AUCTION_STATUS.ENDED_UNPAID, paymentDueAt: null, winnerUserId: null, winningBidId: null } });
    }
  }

  return fetchAuctionById(tx, auctionId);
}

export async function reconcileAuctionState(auctionId: number, settings?: AuctionSettings) {
  const resolvedSettings = settings ?? await getAuctionSettings();
  return prisma.$transaction((tx) => advanceAuctionStateInTransaction(tx, auctionId, resolvedSettings));
}

export async function reconcileEligibleAuctions(settings?: AuctionSettings, limit = 50) {
  const resolvedSettings = settings ?? await getAuctionSettings();
  const candidates = await prisma.auction.findMany({
    where: { status: { in: [AUCTION_STATUS.SCHEDULED, AUCTION_STATUS.LIVE, AUCTION_STATUS.PAYMENT_PENDING] } },
    select: { id: true },
    orderBy: [{ endsAt: 'asc' }],
    take: limit,
  });

  if (candidates.length === 0) return [];
  return Promise.all(candidates.map((candidate) => reconcileAuctionState(candidate.id, resolvedSettings)));
}

export async function readCurrentArtworkAuction(artworkId: number) {
  return fetchCurrentArtworkAuction(prisma, artworkId);
}

export async function getCurrentArtworkAuction(artworkId: number, options?: { reconcile?: boolean }) {
  const auction = await fetchCurrentArtworkAuction(prisma, artworkId);
  if (!auction) return null;
  if (options?.reconcile) {
    return reconcileAuctionState(auction.id);
  }
  return auction;
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
  extendedCount: number;
  bidHistory: Array<{ id: number; amount: number; bidderUserId: number; bidderUsername: string; createdAt: string; status: string }>;
};

export function serializeAuction(auction: Awaited<ReturnType<typeof reconcileAuctionState>> | Awaited<ReturnType<typeof getCurrentArtworkAuction>> | Awaited<ReturnType<typeof readCurrentArtworkAuction>>) {
  if (!auction) return null;
  const bids = auction.bids ?? [];
  const currentBid = getHighestBidAmount({ bids });
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
    extendedCount: Number(auction.extendedCount ?? 0),
    bidHistory: bids.slice(0, 10).map((bid) => ({
      id: bid.id,
      amount: Number(bid.amount),
      bidderUserId: bid.bidderUserId,
      bidderUsername: bid.bidder?.username ?? 'Unknown',
      createdAt: bid.createdAt.toISOString(),
      status: bid.status,
    })),
  } satisfies SerializedAuction;
}

export function buildAuctionViewerState(auction: SerializedAuction | null, currentUser: SessionUser | null, penalty: { permanentlyBanned: boolean; temporarilySuspended: boolean; suspendedUntil: Date | null } | null): AuctionViewerState {
  if (!auction) {
    return {
      canBid: false,
      canPay: false,
      reason: 'Auction is not available.',
      myHighestBid: null,
      isHighestBidder: false,
      isOutbid: false,
      isWinner: false,
    };
  }

  const myHighestBid = currentUser
    ? auction.bidHistory
        .filter((bid) => bid.bidderUserId === currentUser.userId)
        .reduce<number | null>((highest, bid) => (highest == null || bid.amount > highest ? bid.amount : highest), null)
    : null;
  const isHighestBidder = Boolean(currentUser && auction.currentBid != null && myHighestBid != null && Math.abs(myHighestBid - auction.currentBid) < 0.0001);
  const isWinner = Boolean(currentUser && auction.status === AUCTION_STATUS.PAYMENT_PENDING && auction.winnerUserId === currentUser.userId);
  const isOutbid = Boolean(currentUser && myHighestBid != null && !isHighestBidder && !isWinner && auction.currentBid != null && auction.currentBid > myHighestBid);

  if (!currentUser) {
    return {
      canBid: false,
      canPay: false,
      reason: 'Connect with Pi first to join the auction.',
      myHighestBid,
      isHighestBidder,
      isOutbid,
      isWinner,
    };
  }
  if (penalty?.permanentlyBanned) {
    return { canBid: false, canPay: false, reason: 'Your account is permanently blocked from auctions because of repeated non-payment.', myHighestBid, isHighestBidder, isOutbid, isWinner };
  }
  if (penalty?.temporarilySuspended) {
    return { canBid: false, canPay: false, reason: `Auction access is suspended until ${penalty.suspendedUntil?.toLocaleString()}.`, myHighestBid, isHighestBidder, isOutbid, isWinner };
  }
  if (auction.sellerUserId === currentUser.userId) {
    return { canBid: false, canPay: false, reason: 'You cannot bid on your own artwork.', myHighestBid, isHighestBidder, isOutbid, isWinner };
  }
  if (auction.status === AUCTION_STATUS.PAYMENT_PENDING && auction.winnerUserId === currentUser.userId) {
    return { canBid: false, canPay: true, reason: 'You won this auction. Complete payment before the deadline.', myHighestBid: auction.winningAmount, isHighestBidder, isOutbid: false, isWinner: true };
  }
  if (auction.status !== AUCTION_STATUS.LIVE && auction.status !== AUCTION_STATUS.SCHEDULED) {
    return { canBid: false, canPay: false, reason: 'This auction is no longer accepting bids.', myHighestBid, isHighestBidder, isOutbid, isWinner };
  }
  if (auction.status === AUCTION_STATUS.SCHEDULED) {
    return { canBid: false, canPay: false, reason: 'This auction has not started yet.', myHighestBid, isHighestBidder, isOutbid, isWinner };
  }
  return { canBid: true, canPay: false, reason: null, myHighestBid, isHighestBidder, isOutbid, isWinner };
}
