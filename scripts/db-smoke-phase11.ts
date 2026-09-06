import { neon } from '@neondatabase/serverless';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { config } from 'dotenv';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import {
	campaignDomains,
	campaigns,
	clickEvents,
	destinations,
	user,
	visitors
} from '../src/lib/server/db/schema.ts';

config({ quiet: true });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
const baseUrl = process.argv.find((value) => /^https?:\/\//.test(value)) ?? 'http://127.0.0.1:5175';
const db = drizzle(neon(process.env.DATABASE_URL));
const [owner] = await db.select({ id: user.id }).from(user).limit(1);
if (!owner) throw new Error('Create at least one user before running the Phase 11 smoke test');

const campaignId = crypto.randomUUID();
const destinationId = crypto.randomUUID();
const hostname = `phase11-${crypto.randomUUID().slice(0, 8)}.localhost`;
const slug = `phase11-${crypto.randomUUID().slice(0, 8)}`;
let visitorIds: string[] = [];

function requestVirtualHost(url: string, headers: Record<string, string>) {
	return new Promise<{ status: number; headers: import('node:http').IncomingHttpHeaders }>(
		(resolve, reject) => {
			const request = httpRequest(url, { headers }, (response) => {
				response.resume();
				response.on('end', () =>
					resolve({ status: response.statusCode ?? 0, headers: response.headers })
				);
			});
			request.on('error', reject);
			request.end();
		}
	);
}

try {
	await db.insert(campaigns).values({
		id: campaignId,
		ownerId: owner.id,
		name: 'Phase 11 custom domain smoke',
		slug,
		status: 'active',
		redirectType: 'direct'
	});
	await db.insert(destinations).values({
		id: destinationId,
		campaignId,
		name: 'Phase 11 destination',
		url: 'https://example.com/phase-11',
		position: 0
	});
	await db.insert(campaignDomains).values({
		campaignId,
		ownerId: owner.id,
		hostname,
		status: 'verified',
		verificationToken: crypto.randomUUID().replaceAll('-', '')
	});

	const response = await requestVirtualHost(`${baseUrl}/?utm_source=custom-domain-smoke`, {
		host: hostname,
		'cf-connecting-ip': '203.0.113.91',
		'cf-ipcountry': 'ID',
		accept: 'text/html',
		'accept-language': 'id-ID',
		'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36'
	});
	assert.equal(response.status, 302);
	assert.equal(
		response.headers.location,
		'https://example.com/phase-11?utm_source=custom-domain-smoke'
	);
	assert.ok(response.headers['x-request-id']);

	const events = await db
		.select({ visitorId: clickEvents.visitorId, campaignId: clickEvents.campaignId })
		.from(clickEvents)
		.where(eq(clickEvents.campaignId, campaignId));
	assert.equal(events.length, 1);
	assert.equal(events[0].campaignId, campaignId);
	visitorIds = events.flatMap((event) => event.visitorId ?? []);
	console.log('Phase 11 custom-domain root redirect smoke test passed.', { hostname });
} finally {
	await db.delete(campaigns).where(eq(campaigns.id, campaignId));
	if (visitorIds.length) await db.delete(visitors).where(inArray(visitors.id, visitorIds));
}
