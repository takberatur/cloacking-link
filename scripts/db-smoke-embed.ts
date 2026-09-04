import 'dotenv/config';
import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import { and, count, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import {
	campaignEmbedSettings,
	campaigns,
	destinations,
	embedEvents,
	user
} from '../src/lib/server/db/schema';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
const baseUrl = process.argv[2]?.replace(/\/$/, '');
if (!baseUrl) throw new Error('Pass the preview base URL as the first argument');

const db = drizzle(neon(process.env.DATABASE_URL));
const [owner] = await db.select({ id: user.id }).from(user).limit(1);
if (!owner) {
	console.log('Embed smoke test skipped: no user exists in the database.');
	process.exit(0);
}

const campaignId = crypto.randomUUID();
const publicKey = crypto.randomUUID().replaceAll('-', '');
const slug = `embed-smoke-${crypto.randomUUID().slice(0, 8)}`;

try {
	await db.insert(campaigns).values({
		id: campaignId,
		ownerId: owner.id,
		name: 'Embed smoke test',
		slug,
		status: 'active',
		redirectType: 'direct',
		botProtectionEnabled: false
	});
	await db.insert(destinations).values({
		campaignId,
		name: 'Embed primary',
		url: 'https://example.com/embed-offer',
		position: 0
	});
	const [setting] = await db
		.insert(campaignEmbedSettings)
		.values({
			campaignId,
			publicKey,
			enabled: true,
			allowedDomains: ['publisher.example'],
			selector: 'a[data-linkshift]',
			rewriteLinks: true,
			forwardPageQuery: true
		})
		.returning({ id: campaignEmbedSettings.id });

	const denied = await fetch(`${baseUrl}/e/${publicKey}.js`, {
		headers: { referer: 'https://attacker.example/page' }
	});
	assert.equal(denied.status, 404);

	const scriptResponse = await fetch(`${baseUrl}/e/${publicKey}.js`, {
		headers: { referer: 'https://publisher.example/article' }
	});
	const script = await scriptResponse.text();
	assert.equal(scriptResponse.status, 200);
	assert.match(script, /a\[data-linkshift\]/);
	const token = script.match(/"token":"([^"]+)"/)?.[1];
	assert.ok(token, 'Embed token not found in script');

	const impression = await fetch(`${baseUrl}/api/embed/${publicKey}/event`, {
		method: 'POST',
		headers: {
			origin: 'https://publisher.example',
			'content-type': 'application/json',
			'user-agent': 'Embed smoke test'
		},
		body: JSON.stringify({
			token,
			type: 'impression',
			pageUrl: 'https://publisher.example/article?utm_source=smoke'
		})
	});
	assert.equal(impression.status, 204);

	const click = await fetch(
		`${baseUrl}/api/embed/${publicKey}/redirect?token=${encodeURIComponent(token)}&q=utm_source%3Dsmoke`,
		{
			redirect: 'manual',
			headers: { referer: 'https://publisher.example/article', 'user-agent': 'Embed smoke test' }
		}
	);
	assert.equal(click.status, 302);
	assert.equal(click.headers.get('location'), `/r/${slug}?utm_source=smoke`);

	const [events] = await db
		.select({ total: count() })
		.from(embedEvents)
		.where(and(eq(embedEvents.embedSettingId, setting.id), eq(embedEvents.campaignId, campaignId)));
	assert.equal(events.total, 2);
	console.log('Embed Neon and public endpoints smoke test passed.');
} finally {
	await db.delete(campaigns).where(eq(campaigns.id, campaignId));
}
