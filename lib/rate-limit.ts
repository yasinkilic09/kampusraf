export type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitGlobal = typeof globalThis & {
  __kampusrafRateLimitStore?: Map<string, RateLimitEntry>;
  __kampusrafRateLimitLastSweep?: number;
};

const globalStore = globalThis as RateLimitGlobal;

function getStore() {
  if (!globalStore.__kampusrafRateLimitStore) {
    globalStore.__kampusrafRateLimitStore = new Map<string, RateLimitEntry>();
  }

  return globalStore.__kampusrafRateLimitStore;
}

function sweepExpiredEntries(now: number) {
  const lastSweep = globalStore.__kampusrafRateLimitLastSweep || 0;

  if (now - lastSweep < 60_000) return;

  const store = getStore();

  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }

  globalStore.__kampusrafRateLimitLastSweep = now;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  now = Date.now()
): RateLimitResult {
  sweepExpiredEntries(now);

  const store = getStore();
  const existing = store.get(key);
  const entry =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + config.windowMs,
        };

  entry.count += 1;
  store.set(key, entry);

  const remaining = Math.max(config.limit - entry.count, 0);
  const retryAfterSeconds = Math.max(
    Math.ceil((entry.resetAt - now) / 1000),
    1
  );

  return {
    allowed: entry.count <= config.limit,
    limit: config.limit,
    remaining,
    resetAt: entry.resetAt,
    retryAfterSeconds,
  };
}

export function getClientIp(headers: Headers) {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
    headers.get("x-vercel-forwarded-for")?.split(",")[0],
  ];

  return (
    candidates
      .map((value) => value?.trim())
      .find((value) => value && value.length <= 64) || "unknown"
  );
}

export function createRateLimitHeaders(result: RateLimitResult) {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    "Retry-After": String(result.retryAfterSeconds),
  };
}
