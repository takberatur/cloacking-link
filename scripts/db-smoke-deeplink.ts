import 'dotenv/config';
import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { campaigns, destinationDeepLinks, destinations, user } from '../src/lib/server/db/schema';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
const baseUrl = process.argv[2]?.replace(/\/$/, '');
if (!baseUrl) throw new Error('Pass the preview base URL as the first argument');

const db = drizzle(neon(process.env.DATABASE_URL));
const [owner] = await db.select({ id: user.id }).from(user).limit(1);
if (!owner) {
	console.log('Deeplink smoke test skipped: no user exists in the database.');
	process.exit(0);
}

const campaignId = crypto.randomUUID();
const destinationId = crypto.randomUUID();
const slug = `deeplink-smoke-${crypto.randomUUID().slice(0, 8)}`;

try {
	await db.insert(campaigns).values({
		id: campaignId,
		ownerId: owner.id,
		name: 'Deeplink smoke test',
		slug,
		status: 'active',
		redirectType: 'deeplink',
		botProtectionEnabled: false
	});
	await db.insert(destinations).values({
		id: destinationId,
		campaignId,
		name: 'Test app',
		url: 'https://example.com/offer',
		position: 0
	});
	await db.insert(destinationDeepLinks).values({
		destinationId,
		androidScheme: 'testapp://offer/42',
		androidPackageName: 'com.example.testapp',
		webFallbackUrl: 'https://example.com/fallback'
	});

	const redirectResponse = await fetch(`${baseUrl}/r/${slug}?sub_id=smoke`, {
		redirect: 'manual',
		headers: {
			'user-agent':
				'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36',
			'cf-ipcountry': 'ID',
			'cf-connecting-ip': '203.0.113.88'
		}
	});
	assert.equal(redirectResponse.status, 302);
	const location = redirectResponse.headers.get('location');
	assert.ok(location?.startsWith(`/d/${slug}?rid=`), location ?? 'Missing redirect location');

	const launchResponse = await fetch(`${baseUrl}${location}`);
	const html = await launchResponse.text();
	assert.equal(launchResponse.status, 200);
	assert.match(html, /Open Test app/);
	assert.match(html, /intent:\/\/offer\/42\?sub_id=smoke/);
	assert.match(html, /com\.example\.testapp/);
	if (process.argv.includes('--inspect')) {
		console.log(`Deeplink inspection URL: ${baseUrl}${location}`);
		await new Promise((resolve) => setTimeout(resolve, 90_000));
	}
	console.log('Deeplink Neon and public route smoke test passed.');
} finally {
	await db.delete(campaigns).where(eq(campaigns.id, campaignId));
}
