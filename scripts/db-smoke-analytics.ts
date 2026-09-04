import 'dotenv/config';
import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import { and, count, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { campaigns, clickEvents, destinations, user, visitors } from '../src/lib/server/db/schema';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
const db = drizzle(neon(process.env.DATABASE_URL));
const [owner] = await db.select({ id: user.id }).from(user).limit(1);
if (!owner) {
	console.log('Analytics smoke test skipped: no user exists in the database.');
	process.exit(0);
}

const campaignId = crypto.randomUUID();
const destinationId = crypto.randomUUID();
const visitorId = crypto.randomUUID();
const now = new Date();
const from = new Date(now.getTime() - 60 * 60 * 1000);
const to = new Date(now.getTime() + 60 * 60 * 1000);

try {
	await db.insert(campaigns).values({
		id: campaignId,
		ownerId: owner.id,
		name: 'Analytics smoke test',
		slug: `analytics-smoke-${crypto.randomUUID().slice(0, 8)}`,
		status: 'active'
	});
	await db.insert(destinations).values({
		id: destinationId,
		campaignId,
		name: 'Analytics destination',
		url: 'https://example.com/analytics-smoke'
	});
	await db.insert(visitors).values({
		id: visitorId,
		ownerId: owner.id,
		visitorKeyHash: `analytics-smoke-${crypto.randomUUID()}`,
		lastCountryCode: 'ID',
		lastDeviceType: 'mobile',
		lastBrowser: 'Chrome',
		lastOs: 'Android'
	});
	await db.insert(clickEvents).values([
		{
			ownerId: owner.id,
			campaignId,
			destinationId,
			visitorId,
			outcome: 'redirected',
			redirectType: 'direct',
			countryCode: 'ID',
			deviceType: 'mobile',
			browser: 'Chrome',
			os: 'Android',
			isUnique: true,
			occurredAt: now
		},
		{
			ownerId: owner.id,
			campaignId,
			destinationId,
			visitorId,
			outcome: 'safelink',
			redirectType: 'safelink',
			countryCode: 'ID',
			deviceType: 'mobile',
			browser: 'Chrome',
			os: 'Android',
			occurredAt: now
		},
		{
			ownerId: owner.id,
			campaignId,
			visitorId,
			outcome: 'blocked',
			redirectType: 'direct',
			countryCode: 'US',
			deviceType: 'desktop',
			browser: 'Unknown',
			os: 'Linux',
			isBot: true,
			botScore: 100,
			occurredAt: now
		}
	]);

	const where = and(
		eq(clickEvents.ownerId, owner.id),
		eq(clickEvents.campaignId, campaignId),
		gte(clickEvents.occurredAt, from),
		lt(clickEvents.occurredAt, to)
	);
	const [summary] = await db
		.select({
			total: count(),
			uniqueVisitors: sql<number>`count(distinct ${clickEvents.visitorId})::int`,
			blocked: sql<number>`count(*) filter (where ${clickEvents.outcome} = 'blocked')::int`,
			delivered: sql<number>`count(*) filter (where ${clickEvents.outcome} in ('redirected', 'safelink', 'fallback'))::int`
		})
		.from(clickEvents)
		.where(where);
	const destinationsResult = await db
		.select({ label: destinations.name, value: count() })
		.from(clickEvents)
		.innerJoin(destinations, eq(destinations.id, clickEvents.destinationId))
		.where(where)
		.groupBy(destinations.id)
		.orderBy(desc(count()));

	assert.deepEqual(summary, { total: 3, uniqueVisitors: 1, blocked: 1, delivered: 2 });
	assert.deepEqual(destinationsResult, [{ label: 'Analytics destination', value: 2 }]);
	console.log('Analytics Neon aggregation smoke test passed.');
} finally {
	await db.delete(campaigns).where(eq(campaigns.id, campaignId));
	await db.delete(visitors).where(eq(visitors.id, visitorId));
}
