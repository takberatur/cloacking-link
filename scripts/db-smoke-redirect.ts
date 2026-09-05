import 'dotenv/config';
import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { campaigns, clickEvents, destinations, user, visitors } from '../src/lib/server/db/schema';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const db = drizzle(neon(process.env.DATABASE_URL));
const baseUrl = process.argv.find((value) => /^https?:\/\//.test(value)) ?? 'http://127.0.0.1:5175';
const [owner] = await db.select({ id: user.id }).from(user).limit(1);
if (!owner) {
	console.log('Redirect smoke test skipped: no user exists in the database.');
	process.exit(0);
}

const campaignId = crypto.randomUUID();
const destinationId = crypto.randomUUID();
const slug = `redirect-smoke-${crypto.randomUUID().slice(0, 8)}`;
let trackedVisitorIds: string[] = [];

try {
	await db.insert(campaigns).values({
		id: campaignId,
		ownerId: owner.id,
		name: 'Redirect smoke test',
		slug,
		status: 'active',
		redirectType: 'direct',
		rotationStrategy: 'equal',
		preserveQueryParams: true,
		trackingEnabled: true,
		botProtectionEnabled: true
	});
	await db.insert(destinations).values({
		id: destinationId,
		campaignId,
		name: 'Smoke destination',
		url: 'https://example.com/offer?source=owned',
		position: 0
	});

	const first = await fetch(`${baseUrl}/r/${slug}?utm_source=smoke&tag=a&tag=b`, {
		redirect: 'manual',
		headers: {
			'cf-connecting-ip': '203.0.113.10',
			'cf-ipcountry': 'ID',
			'user-agent': 'Mozilla/5.0 (Linux; Android 14) Chrome/124.0 Mobile Safari/537.36'
		}
	});
	assert.equal(first.status, 302);
	assert.equal(
		first.headers.get('location'),
		'https://example.com/offer?source=owned&utm_source=smoke&tag=a&tag=b'
	);
	assert.ok(first.headers.get('x-request-id'));
	assert.equal(first.headers.get('ratelimit-limit'), '120');
	assert.ok(Number(first.headers.get('ratelimit-remaining')) >= 0);
	assert.match(first.headers.get('server-timing') ?? '', /^total;dur=\d+$/);
	const visitorCookie = first.headers.get('set-cookie')?.split(';')[0];
	assert.ok(visitorCookie?.startsWith('ls_visitor='));

	const blocked = await fetch(`${baseUrl}/r/${slug}`, {
		redirect: 'manual',
		headers: {
			cookie: visitorCookie,
			'cf-connecting-ip': '203.0.113.10',
			'cf-ipcountry': 'ID',
			'user-agent': 'Googlebot/2.1'
		}
	});
	assert.equal(blocked.status, 403);

	const events = await db
		.select({
			outcome: clickEvents.outcome,
			destinationId: clickEvents.destinationId,
			visitorId: clickEvents.visitorId,
			isBot: clickEvents.isBot,
			riskScore: clickEvents.riskScore,
			metadata: clickEvents.metadata,
			countryCode: clickEvents.countryCode
		})
		.from(clickEvents)
		.where(eq(clickEvents.campaignId, campaignId));
	assert.equal(events.length, 2);
	assert.ok(
		events.some((event) => event.outcome === 'redirected' && event.destinationId === destinationId)
	);
	assert.ok(events.some((event) => event.outcome === 'blocked' && event.isBot));
	assert.ok(events.some((event) => event.isBot && event.riskScore === 100));
	assert.ok(
		events.some(
			(event) =>
				event.isBot &&
				Array.isArray((event.metadata as { riskReasons?: unknown }).riskReasons) &&
				(event.metadata as { riskReasons: string[] }).riskReasons.includes('known_bot_user_agent')
		)
	);
	assert.ok(events.every((event) => event.countryCode === 'ID'));
	trackedVisitorIds = [...new Set(events.flatMap((event) => event.visitorId ?? []))];

	console.log('Redirect HTTP + Neon smoke test passed.');
} finally {
	await db.delete(campaigns).where(eq(campaigns.id, campaignId));
	if (trackedVisitorIds.length > 0) {
		await db.delete(visitors).where(inArray(visitors.id, trackedVisitorIds));
	}
}
