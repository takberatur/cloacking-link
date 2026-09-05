import { and, asc, count, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { blockRules, campaigns, clickEvents, destinations } from '$lib/server/db/schema';
import { campaignAccess } from '$lib/server/team';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VISITOR_PAGE_SIZE = 20;

export type AnalyticsRange = {
	from: string;
	to: string;
	fromDate: Date;
	toExclusive: Date;
};

function utcDate(value: string): Date | null {
	if (!DATE_PATTERN.test(value)) return null;
	const date = new Date(`${value}T00:00:00.000Z`);
	return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(value: Date): string {
	return value.toISOString().slice(0, 10);
}

export function parseAnalyticsRange(
	searchParams: URLSearchParams,
	now = new Date()
): AnalyticsRange {
	const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	const defaultFrom = new Date(today);
	defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
	let fromDate = utcDate(searchParams.get('from') ?? '') ?? defaultFrom;
	let toDate = utcDate(searchParams.get('to') ?? '') ?? today;

	if (fromDate > toDate) [fromDate, toDate] = [toDate, fromDate];
	const earliest = new Date(toDate);
	earliest.setUTCDate(earliest.getUTCDate() - 365);
	if (fromDate < earliest) fromDate = earliest;

	const toExclusive = new Date(toDate);
	toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
	return { from: dateKey(fromDate), to: dateKey(toDate), fromDate, toExclusive };
}

function eventRange(ownerId: string, range: AnalyticsRange, campaignId?: string) {
	return and(
		eq(clickEvents.ownerId, ownerId),
		campaignId ? eq(clickEvents.campaignId, campaignId) : undefined,
		gte(clickEvents.occurredAt, range.fromDate),
		lt(clickEvents.occurredAt, range.toExclusive)
	);
}

function summarySelection() {
	return {
		totalClicks: count(),
		uniqueVisitors: sql<number>`count(distinct ${clickEvents.visitorId})::int`,
		blockedClicks: sql<number>`count(*) filter (where ${clickEvents.outcome} = 'blocked')::int`,
		deliveredClicks: sql<number>`count(*) filter (where ${clickEvents.outcome} in ('redirected', 'safelink', 'fallback'))::int`,
		botClicks: sql<number>`count(*) filter (where ${clickEvents.isBot} = true)::int`
	};
}

function timelineSelection() {
	return {
		day: sql<string>`(${clickEvents.occurredAt} at time zone 'UTC')::date::text`,
		clicks: count(),
		blocked: sql<number>`count(*) filter (where ${clickEvents.outcome} = 'blocked')::int`,
		delivered: sql<number>`count(*) filter (where ${clickEvents.outcome} in ('redirected', 'safelink', 'fallback'))::int`
	};
}

function fillTimeline(
	range: AnalyticsRange,
	rows: { day: string; clicks: number; blocked: number; delivered: number }[]
) {
	const byDay = new Map(rows.map((row) => [row.day, row]));
	const result = [];
	for (
		const cursor = new Date(range.fromDate);
		cursor < range.toExclusive;
		cursor.setUTCDate(cursor.getUTCDate() + 1)
	) {
		const day = dateKey(cursor);
		result.push(byDay.get(day) ?? { day, clicks: 0, blocked: 0, delivered: 0 });
	}
	return result;
}

function withRates<
	T extends { totalClicks: number; blockedClicks: number; deliveredClicks: number }
>(summary: T) {
	return {
		...summary,
		deliveryRate:
			summary.totalClicks === 0
				? 0
				: Math.round((summary.deliveredClicks / summary.totalClicks) * 1000) / 10,
		blockRate:
			summary.totalClicks === 0
				? 0
				: Math.round((summary.blockedClicks / summary.totalClicks) * 1000) / 10
	};
}

export async function getDashboardAnalytics(ownerId: string, range: AnalyticsRange) {
	const accessibleCampaigns = db
		.select({ id: campaigns.id })
		.from(campaigns)
		.where(campaignAccess(ownerId));
	const where = and(
		inArray(clickEvents.campaignId, accessibleCampaigns),
		gte(clickEvents.occurredAt, range.fromDate),
		lt(clickEvents.occurredAt, range.toExclusive)
	);
	const day = sql<string>`(${clickEvents.occurredAt} at time zone 'UTC')::date::text`;
	const [summaryRows, timelineRows, topCampaigns, countries, devices, browsers, activeRows] =
		await Promise.all([
			db.select(summarySelection()).from(clickEvents).where(where),
			db.select(timelineSelection()).from(clickEvents).where(where).groupBy(day).orderBy(asc(day)),
			db
				.select({
					id: campaigns.id,
					name: campaigns.name,
					slug: campaigns.slug,
					status: campaigns.status,
					clicks: count(),
					blocked: sql<number>`count(*) filter (where ${clickEvents.outcome} = 'blocked')::int`,
					uniqueVisitors: sql<number>`count(distinct ${clickEvents.visitorId})::int`
				})
				.from(clickEvents)
				.innerJoin(campaigns, eq(campaigns.id, clickEvents.campaignId))
				.where(where)
				.groupBy(campaigns.id)
				.orderBy(desc(count()))
				.limit(10),
			db
				.select({
					label: sql<string>`coalesce(${clickEvents.countryCode}, 'Unknown')`,
					value: count()
				})
				.from(clickEvents)
				.where(where)
				.groupBy(sql`coalesce(${clickEvents.countryCode}, 'Unknown')`)
				.orderBy(desc(count()))
				.limit(8),
			db
				.select({
					label: sql<string>`coalesce(${clickEvents.deviceType}, 'unknown')`,
					value: count()
				})
				.from(clickEvents)
				.where(where)
				.groupBy(sql`coalesce(${clickEvents.deviceType}, 'unknown')`)
				.orderBy(desc(count()))
				.limit(8),
			db
				.select({
					label: sql<string>`coalesce(${clickEvents.browser}, 'Unknown')`,
					value: count()
				})
				.from(clickEvents)
				.where(where)
				.groupBy(sql`coalesce(${clickEvents.browser}, 'Unknown')`)
				.orderBy(desc(count()))
				.limit(8),
			db
				.select({ total: count() })
				.from(campaigns)
				.where(and(campaignAccess(ownerId), eq(campaigns.status, 'active')))
		]);

	return {
		range: { from: range.from, to: range.to },
		summary: withRates({ ...summaryRows[0], activeCampaigns: activeRows[0]?.total ?? 0 }),
		timeline: fillTimeline(range, timelineRows),
		topCampaigns,
		countries,
		devices,
		browsers
	};
}

export async function getCampaignAnalytics(
	ownerId: string,
	campaignId: string,
	range: AnalyticsRange,
	requestedPage = 1
) {
	const campaign = await db.query.campaigns.findFirst({
		where: and(eq(campaigns.id, campaignId), campaignAccess(ownerId)),
		columns: { id: true, ownerId: true, name: true, slug: true, status: true }
	});
	if (!campaign) return null;

	const where = eventRange(campaign.ownerId, range, campaignId);
	const day = sql<string>`(${clickEvents.occurredAt} at time zone 'UTC')::date::text`;
	const [summaryRows, timelineRows, destinationRows, blockedReasons, countries, visitorCount] =
		await Promise.all([
			db.select(summarySelection()).from(clickEvents).where(where),
			db.select(timelineSelection()).from(clickEvents).where(where).groupBy(day).orderBy(asc(day)),
			db
				.select({
					id: destinations.id,
					label: destinations.name,
					value: count()
				})
				.from(clickEvents)
				.innerJoin(destinations, eq(destinations.id, clickEvents.destinationId))
				.where(where)
				.groupBy(destinations.id)
				.orderBy(desc(count())),
			db
				.select({
					label: sql<string>`coalesce(${blockRules.name}, case when ${clickEvents.isBot} then 'Automatic bot protection' else 'Policy block' end)`,
					value: count()
				})
				.from(clickEvents)
				.leftJoin(blockRules, eq(blockRules.id, clickEvents.blockRuleId))
				.where(and(where, eq(clickEvents.outcome, 'blocked')))
				.groupBy(
					sql`coalesce(${blockRules.name}, case when ${clickEvents.isBot} then 'Automatic bot protection' else 'Policy block' end)`
				)
				.orderBy(desc(count())),
			db
				.select({
					label: sql<string>`coalesce(${clickEvents.countryCode}, 'Unknown')`,
					value: count()
				})
				.from(clickEvents)
				.where(where)
				.groupBy(sql`coalesce(${clickEvents.countryCode}, 'Unknown')`)
				.orderBy(desc(count()))
				.limit(10),
			db.select({ total: count() }).from(clickEvents).where(where)
		]);

	const totalVisitorRows = visitorCount[0]?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(totalVisitorRows / VISITOR_PAGE_SIZE));
	const page = Math.min(Math.max(1, requestedPage || 1), totalPages);
	const visitorRows = await db
		.select({
			id: clickEvents.id,
			requestId: clickEvents.requestId,
			visitorId: clickEvents.visitorId,
			occurredAt: clickEvents.occurredAt,
			outcome: clickEvents.outcome,
			countryCode: clickEvents.countryCode,
			deviceType: clickEvents.deviceType,
			browser: clickEvents.browser,
			os: clickEvents.os,
			isBot: clickEvents.isBot,
			responseTimeMs: clickEvents.responseTimeMs,
			destinationName: destinations.name,
			blockReason: blockRules.name
		})
		.from(clickEvents)
		.leftJoin(destinations, eq(destinations.id, clickEvents.destinationId))
		.leftJoin(blockRules, eq(blockRules.id, clickEvents.blockRuleId))
		.where(where)
		.orderBy(desc(clickEvents.occurredAt))
		.limit(VISITOR_PAGE_SIZE)
		.offset((page - 1) * VISITOR_PAGE_SIZE);

	return {
		campaign,
		range: { from: range.from, to: range.to },
		summary: withRates(summaryRows[0]),
		timeline: fillTimeline(range, timelineRows),
		destinations: destinationRows,
		blockedReasons,
		countries,
		visitors: {
			items: visitorRows,
			total: totalVisitorRows,
			page,
			pageSize: VISITOR_PAGE_SIZE,
			totalPages
		}
	};
}
