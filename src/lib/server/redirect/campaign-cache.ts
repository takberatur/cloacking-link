import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { campaigns, destinations } from '$lib/server/db/schema';
import { logEvent, positiveIntegerEnv } from '$lib/server/observability';
import { getUpstash } from '$lib/server/upstash';

const memoryCache = new Map<string, { expiresAt: number; value: RedirectCampaignConfig }>();
const CACHE_PREFIX = 'redirect:campaign:v1:';

async function queryCampaign(slug: string) {
	return db.query.campaigns.findFirst({
		where: eq(campaigns.slug, slug),
		with: {
			popunderSetting: true,
			destinations: {
				orderBy: [asc(destinations.position)],
				with: { geoTargets: true, deepLink: true }
			}
		}
	});
}

export type RedirectCampaignConfig = NonNullable<Awaited<ReturnType<typeof queryCampaign>>>;

function ttlSeconds() {
	return positiveIntegerEnv('REDIRECT_CACHE_TTL_SECONDS', 30, 300);
}

function cacheKey(slug: string) {
	return `${CACHE_PREFIX}${slug}`;
}

function deserialize(value: unknown): RedirectCampaignConfig | null {
	try {
		const raw = typeof value === 'string' ? value : JSON.stringify(value);
		return JSON.parse(raw, (key, item) => {
			if (
				typeof item === 'string' &&
				(key.endsWith('At') || key === 'startsAt' || key === 'endsAt')
			) {
				const date = new Date(item);
				return Number.isNaN(date.getTime()) ? item : date;
			}
			return item;
		}) as RedirectCampaignConfig;
	} catch {
		return null;
	}
}

export async function getRedirectCampaign(slug: string): Promise<RedirectCampaignConfig | null> {
	const local = memoryCache.get(slug);
	if (local && local.expiresAt > Date.now()) return local.value;
	if (local) memoryCache.delete(slug);

	const redis = getUpstash();
	if (redis) {
		try {
			const cached = deserialize(await redis.get<unknown>(cacheKey(slug)));
			if (cached) {
				memoryCache.set(slug, { expiresAt: Date.now() + ttlSeconds() * 1000, value: cached });
				return cached;
			}
		} catch (error) {
			logEvent('warn', 'redirect.cache.read_failed', { slug, error });
		}
	}

	const campaign = await queryCampaign(slug);
	if (!campaign) return null;
	const ttl = ttlSeconds();
	memoryCache.set(slug, { expiresAt: Date.now() + ttl * 1000, value: campaign });
	if (redis) {
		try {
			await redis.set(cacheKey(slug), JSON.stringify(campaign), { ex: ttl });
		} catch (error) {
			logEvent('warn', 'redirect.cache.write_failed', { slug, error });
		}
	}
	return campaign;
}

export async function invalidateRedirectCampaign(...slugs: (string | null | undefined)[]) {
	const normalized = [...new Set(slugs.filter((slug): slug is string => Boolean(slug)))];
	for (const slug of normalized) memoryCache.delete(slug);
	const redis = getUpstash();
	if (!redis || normalized.length === 0) return;
	try {
		await redis.del(...normalized.map(cacheKey));
	} catch (error) {
		logEvent('warn', 'redirect.cache.invalidate_failed', { slugs: normalized, error });
	}
}
