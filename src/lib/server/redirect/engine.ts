import { createHmac } from 'node:crypto';
import { BETTER_AUTH_SECRET } from '$env/static/private';
import { and, asc, count, eq, gte, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { blockRules, campaigns, clickEvents, destinations, visitors } from '$lib/server/db/schema';
import { evaluateRules, safeExternalUrl, withQueryParams } from './rules';
import { selectDestination } from './rotation';
import type { EvaluatedRule, VisitorContext } from './types';

type QueryValues = Record<string, string | string[]>;

export type RedirectResolution =
	| {
			kind: 'redirect';
			location: string;
			status: 301 | 302 | 307 | 308;
			requestId: string;
			stripReferrer: boolean;
	  }
	| { kind: 'blocked'; status: 403; requestId: string }
	| { kind: 'not_found'; status: 404 };

export type ResolveRedirectInput = {
	slug: string;
	visitor: VisitorContext;
	visitorToken?: string | null;
	queryParams: QueryValues;
	now?: Date;
};

function keyedHash(value: string): string {
	return createHmac('sha256', BETTER_AUTH_SECRET).update(value).digest('hex');
}

function startOfUtcDay(value: Date): Date {
	return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function validRedirectCode(code: number): 301 | 302 | 307 | 308 {
	return code === 301 || code === 307 || code === 308 ? code : 302;
}

async function upsertVisitor(
	ownerId: string,
	visitorKeyHash: string,
	visitor: VisitorContext,
	now: Date
) {
	const [row] = await db
		.insert(visitors)
		.values({
			ownerId,
			visitorKeyHash,
			firstSeenAt: now,
			lastSeenAt: now,
			lastCountryCode: visitor.countryCode,
			lastDeviceType: visitor.deviceType,
			lastBrowser: visitor.browser,
			lastOs: visitor.os
		})
		.onConflictDoUpdate({
			target: [visitors.ownerId, visitors.visitorKeyHash],
			set: {
				lastSeenAt: now,
				totalVisits: sql`${visitors.totalVisits} + 1`,
				lastCountryCode: visitor.countryCode,
				lastDeviceType: visitor.deviceType,
				lastBrowser: visitor.browser,
				lastOs: visitor.os
			}
		})
		.returning({ id: visitors.id, totalVisits: visitors.totalVisits });

	return row;
}

async function trackDecision(input: {
	requestId: string;
	ownerId: string;
	campaignId: string;
	destinationId?: string | null;
	blockRuleId?: string | null;
	outcome: 'redirected' | 'blocked' | 'fallback' | 'safelink' | 'error';
	redirectType: 'direct' | 'safelink' | 'deeplink';
	visitor: VisitorContext;
	visitorKeyHash: string;
	queryParams: QueryValues;
	responseTimeMs: number;
	now: Date;
}) {
	const visitorRow = await upsertVisitor(
		input.ownerId,
		input.visitorKeyHash,
		input.visitor,
		input.now
	);

	await db.insert(clickEvents).values({
		requestId: input.requestId,
		ownerId: input.ownerId,
		campaignId: input.campaignId,
		destinationId: input.destinationId,
		visitorId: visitorRow.id,
		blockRuleId: input.blockRuleId,
		outcome: input.outcome,
		redirectType: input.redirectType,
		countryCode: input.visitor.countryCode,
		regionCode: input.visitor.regionCode,
		city: input.visitor.city,
		timezone: input.visitor.timezone,
		ipHash: input.visitor.ip ? keyedHash(`ip:${input.visitor.ip}`) : null,
		deviceType: input.visitor.deviceType,
		os: input.visitor.os,
		browser: input.visitor.browser,
		userAgent: input.visitor.userAgent,
		referrer: input.visitor.referrer,
		language: input.visitor.language,
		isUnique: visitorRow.totalVisits === 1,
		isBot: input.visitor.isBot,
		botScore: input.visitor.botScore,
		responseTimeMs: input.responseTimeMs,
		queryParams: input.queryParams,
		occurredAt: input.now
	});
}

export async function resolveRedirect(input: ResolveRedirectInput): Promise<RedirectResolution> {
	const startedAt = performance.now();
	const now = input.now ?? new Date();
	const requestId = crypto.randomUUID();
	const campaign = await db.query.campaigns.findFirst({
		where: eq(campaigns.slug, input.slug),
		with: {
			destinations: {
				orderBy: [asc(destinations.position)],
				with: { geoTargets: true, deepLink: true }
			}
		}
	});

	if (!campaign || campaign.status !== 'active') return { kind: 'not_found', status: 404 };

	const rawVisitorKey =
		input.visitorToken ||
		`${input.visitor.ip ?? 'unknown'}|${input.visitor.userAgent}|${input.visitor.language ?? ''}`;
	const visitorKeyHash = keyedHash(`${campaign.ownerId}:${rawVisitorKey}`);
	const campaignInWindow =
		(!campaign.startsAt || campaign.startsAt <= now) &&
		(!campaign.endsAt || campaign.endsAt >= now);

	const rules = await db
		.select({
			id: blockRules.id,
			campaignId: blockRules.campaignId,
			type: blockRules.type,
			operator: blockRules.operator,
			action: blockRules.action,
			value: blockRules.value,
			redirectUrl: blockRules.redirectUrl,
			position: blockRules.position
		})
		.from(blockRules)
		.where(
			and(
				eq(blockRules.ownerId, campaign.ownerId),
				eq(blockRules.enabled, true),
				or(eq(blockRules.campaignId, campaign.id), isNull(blockRules.campaignId))
			)
		)
		.orderBy(asc(blockRules.position));
	const orderedRules = rules
		.sort(
			(a, b) =>
				a.position - b.position || Number(Boolean(b.campaignId)) - Number(Boolean(a.campaignId))
		)
		.map(({ campaignId: _campaignId, position: _position, ...rule }) => rule as EvaluatedRule);
	const ruleDecision = evaluateRules(orderedRules, input.visitor);
	const automaticBotBlock =
		campaign.botProtectionEnabled &&
		input.visitor.isBot &&
		!(ruleDecision.matched && ruleDecision.action === 'allow');

	const record = async (
		outcome: 'redirected' | 'blocked' | 'fallback' | 'safelink' | 'error',
		destinationId?: string | null,
		blockRuleId?: string | null
	) => {
		if (!campaign.trackingEnabled) return false;
		try {
			await trackDecision({
				requestId,
				ownerId: campaign.ownerId,
				campaignId: campaign.id,
				destinationId,
				blockRuleId,
				outcome,
				redirectType: campaign.redirectType,
				visitor: input.visitor,
				visitorKeyHash,
				queryParams: input.queryParams,
				responseTimeMs: Math.max(0, Math.round(performance.now() - startedAt)),
				now
			});
			return true;
		} catch (error) {
			console.error('Unable to persist redirect analytics', {
				requestId,
				campaignId: campaign.id,
				error
			});
			return false;
		}
	};

	if (
		automaticBotBlock ||
		(ruleDecision.matched &&
			(ruleDecision.action === 'block' || ruleDecision.action === 'redirect'))
	) {
		const blockRuleId = ruleDecision.matched ? ruleDecision.rule.id : null;
		await record('blocked', null, blockRuleId);
		if (ruleDecision.matched && ruleDecision.action === 'redirect') {
			const location = withQueryParams(
				ruleDecision.rule.redirectUrl ?? '',
				campaign.preserveQueryParams ? input.queryParams : {}
			);
			if (location) {
				return {
					kind: 'redirect',
					location,
					status: validRedirectCode(campaign.redirectCode),
					requestId,
					stripReferrer: campaign.stripReferrer
				};
			}
		}
		return { kind: 'blocked', status: 403, requestId };
	}

	const activeDestinations = campaign.destinations.filter((destination) => {
		if (!destination.enabled) return false;
		if (destination.activeFrom && destination.activeFrom > now) return false;
		if (destination.activeUntil && destination.activeUntil < now) return false;
		const countries = destination.geoTargets.map((target) => target.countryCode.toUpperCase());
		if (destination.geoMode === 'all') return true;
		if (!input.visitor.countryCode) return destination.geoMode === 'exclude';
		const included = countries.includes(input.visitor.countryCode);
		return destination.geoMode === 'include' ? included : !included;
	});

	const cappedIds = activeDestinations
		.filter((destination) => destination.maxDailyClicks !== null)
		.map((destination) => destination.id);
	const dailyCounts = new Map<string, number>();
	if (cappedIds.length > 0) {
		const rows = await db
			.select({ destinationId: clickEvents.destinationId, total: count() })
			.from(clickEvents)
			.where(
				and(
					inArray(clickEvents.destinationId, cappedIds),
					inArray(clickEvents.outcome, ['redirected', 'safelink']),
					gte(clickEvents.occurredAt, startOfUtcDay(now))
				)
			)
			.groupBy(clickEvents.destinationId);
		for (const row of rows) if (row.destinationId) dailyCounts.set(row.destinationId, row.total);
	}

	const eligibleDestinations = activeDestinations.filter(
		(destination) =>
			destination.maxDailyClicks === null ||
			(dailyCounts.get(destination.id) ?? 0) < destination.maxDailyClicks
	);
	const selected = campaignInWindow
		? selectDestination(eligibleDestinations, campaign.rotationStrategy, visitorKeyHash)
		: null;

	if (!selected) {
		const fallback = withQueryParams(
			campaign.fallbackUrl ?? '',
			campaign.preserveQueryParams ? input.queryParams : {}
		);
		if (!fallback) {
			await record('error');
			return { kind: 'not_found', status: 404 };
		}
		await record('fallback');
		return {
			kind: 'redirect',
			location: fallback,
			status: validRedirectCode(campaign.redirectCode),
			requestId,
			stripReferrer: campaign.stripReferrer
		};
	}

	const deepLink = selected.deepLink;
	const rawLocation =
		campaign.redirectType === 'deeplink'
			? safeExternalUrl(deepLink?.universalLink) ||
				safeExternalUrl(deepLink?.webFallbackUrl) ||
				selected.url
			: selected.url;
	const location = withQueryParams(
		rawLocation,
		campaign.preserveQueryParams ? input.queryParams : {}
	);
	if (!location) {
		await record('error', selected.id);
		return { kind: 'not_found', status: 404 };
	}

	const outcome = campaign.redirectType === 'safelink' ? 'safelink' : 'redirected';
	const tracked = await record(outcome, selected.id);
	return {
		kind: 'redirect',
		location:
			campaign.redirectType === 'safelink' && tracked
				? `/s/${encodeURIComponent(campaign.slug)}?rid=${encodeURIComponent(requestId)}`
				: location,
		status: validRedirectCode(campaign.redirectCode),
		requestId,
		stripReferrer: campaign.stripReferrer
	};
}
