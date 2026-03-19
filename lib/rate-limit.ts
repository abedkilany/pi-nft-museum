import { NextResponse } from "next/server";

type WindowEntry = { count: number; resetAt: number };

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type MultiRateLimitOptions = {
  keyParts: Array<string | number | null | undefined>;
  strategies: Array<{ limit: number; windowMs: number; scope?: string }>;
};

const globalStore = globalThis as typeof globalThis & {
  __PI_NFT_RATE_LIMIT_STORE_V2__?: Map<string, WindowEntry>;
};

const store = globalStore.__PI_NFT_RATE_LIMIT_STORE_V2__ || new Map<string, WindowEntry>();
globalStore.__PI_NFT_RATE_LIMIT_STORE_V2__ = store;

function now() {
  return Date.now();
}

function cleanupExpiredEntries(currentTime: number) {
  if (store.size < 2500) return;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= currentTime) store.delete(key);
  }
}

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

export function rateLimitKey(parts: Array<string | number | null | undefined>) {
  return parts
    .map((part) => String(part ?? ''))
    .map((part) => part.trim())
    .filter(Boolean)
    .join(':');
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const currentTime = now();
  cleanupExpiredEntries(currentTime);

  const existing = store.get(key);
  if (!existing || existing.resetAt <= currentTime) {
    const entry: WindowEntry = { count: 1, resetAt: currentTime + windowMs };
    store.set(key, entry);
    return { ok: true, remaining: Math.max(0, limit - 1), resetAt: entry.resetAt } as const;
  }

  existing.count += 1;
  store.set(key, existing);

  if (existing.count > limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt } as const;
  }

  return { ok: true, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt } as const;
}

export function checkMultiRateLimit({ keyParts, strategies }: MultiRateLimitOptions) {
  let tightestResetAt = 0;

  for (const strategy of strategies) {
    const key = rateLimitKey([...keyParts, strategy.scope || `${strategy.limit}/${strategy.windowMs}`]);
    const result = checkRateLimit({ key, limit: strategy.limit, windowMs: strategy.windowMs });
    tightestResetAt = Math.max(tightestResetAt, result.resetAt);
    if (!result.ok) {
      return { ok: false, resetAt: result.resetAt, strategy } as const;
    }
  }

  return { ok: true, resetAt: tightestResetAt } as const;
}

export function createRateLimitResponse(message: string, resetAt: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now()) / 1000));

  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    },
  );
}
