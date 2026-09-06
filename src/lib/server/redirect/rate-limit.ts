import { createHash } from 'node:crypto';
import { logEvent, positiveIntegerEnv } from '$lib/server/observability';
import { getUpstash } from '$lib/server/upstash';

export type RateLimitResult = {
	allowed: boolean;
	limit: number;
	remaining: number;
	retryAfter: number;
};

const memoryBuckets = new Map<string, { count: number; expiresAt: number }>();
const RATE_LIMIT_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('TTL', KEYS[1])
return { current, ttl }
`;

function rateLimitConfig() {
	return {
		limit: positiveIntegerEnv('REDIRECT_RATE_LIMIT', 120, 10_000),
		windowSeconds: positiveIntegerEnv('REDIRECT_RATE_WINDOW_SECONDS', 60, 3_600)
	};
}

function anonymizedKey(slug: string, identity: string) {
	const digest = createHash('sha256').update(identity).digest('hex').slice(0, 24);
	return `redirect:rate:v1:${slug}:${digest}`;
}

export function checkMemoryRateLimit(
	key: string,
	limit: number,
	windowSeconds: number,
	now = Date.now()
): RateLimitResult {
	const existing = memoryBuckets.get(key);
	const bucket =
		existing && existing.expiresAt > now
			? { count: existing.count + 1, expiresAt: existing.expiresAt }
			: { count: 1, expiresAt: now + windowSeconds * 1000 };
	memoryBuckets.set(key, bucket);

	if (memoryBuckets.size > 10_000) {
		for (const [candidate, value] of memoryBuckets) {
			if (value.expiresAt <= now) memoryBuckets.delete(candidate);
		}
	}

	return {
		allowed: bucket.count <= limit,
		limit,
		remaining: Math.max(0, limit - bucket.count),
		retryAfter: Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000))
	};
}

export async function enforceRedirectRateLimit(slug: string, identity: string) {
	const { limit, windowSeconds } = rateLimitConfig();
	const key = anonymizedKey(slug, identity);
	const redis = getUpstash();
	if (redis) {
		try {
			const [count, ttl] = await redis.eval<[string], [number, number]>(
				RATE_LIMIT_SCRIPT,
				[key],
				[String(windowSeconds)]
			);
			return {
				allowed: count <= limit,
				limit,
				remaining: Math.max(0, limit - count),
				retryAfter: ttl > 0 ? ttl : windowSeconds
			} satisfies RateLimitResult;
		} catch (error) {
			logEvent('warn', 'redirect.rate_limit.redis_failed', { slug, error });
		}
	}

	return checkMemoryRateLimit(key, limit, windowSeconds);
}
