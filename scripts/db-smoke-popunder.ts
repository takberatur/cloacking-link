import 'dotenv/config';
import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { campaigns, destinations, popunderSettings, user } from '../src/lib/server/db/schema';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
const baseUrl = process.argv[2]?.replace(/\/$/, '');
if (!baseUrl) throw new Error('Pass the preview base URL as the first argument');

const db = drizzle(neon(process.env.DATABASE_URL));
const [owner] = await db.select({ id: user.id }).from(user).limit(1);
if (!owner) {
	console.log('Popunder smoke test skipped: no user exists in the database.');
	process.exit(0);
}

const campaignId = crypto.randomUUID();
const slug = `popunder-smoke-${crypto.randomUUID().slice(0, 8)}`;

try {
	await db.insert(campaigns).values({
		id: campaignId,
		ownerId: owner.id,
		name: 'Popunder smoke test',
		slug,
		status: 'active',
		redirectType: 'direct',
		botProtectionEnabled: false
	});
	await db.insert(destinations).values({
		campaignId,
		name: 'Primary offer',
		url: 'https://example.com/primary',
		position: 0
	});
	await db.insert(popunderSettings).values({
		campaignId,
		enabled: true,
		targetUrl: 'https://example.com/second',
		behavior: 'background',
		frequencyCap: 1,
		frequencyWindowHours: 24,
		browserRules: { desktop: 'inherit', mobile: 'same_tab', webview: 'disabled' }
	});

	const redirectResponse = await fetch(`${baseUrl}/r/${slug}?sub_id=smoke`, {
		redirect: 'manual',
		headers: {
			'user-agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
			'cf-ipcountry': 'ID',
			'cf-connecting-ip': '203.0.113.89'
		}
	});
	assert.equal(redirectResponse.status, 302);
	const location = redirectResponse.headers.get('location');
	assert.ok(location?.startsWith(`/p/${slug}?rid=`), location ?? 'Missing popunder location');

	const launchResponse = await fetch(`${baseUrl}${location}`);
	const html = await launchResponse.text();
	assert.equal(launchResponse.status, 200);
	assert.match(html, /Your destination is ready/);
	assert.match(html, /https:\/\/example\.com\/primary\?sub_id=smoke/);
	assert.match(html, /https:\/\/example\.com\/second/);

	const webviewResponse = await fetch(`${baseUrl}/r/${slug}?sub_id=webview`, {
		redirect: 'manual',
		headers: {
			'user-agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Mobile TikTok/36.2.4',
			'cf-ipcountry': 'ID',
			'cf-connecting-ip': '203.0.113.90'
		}
	});
	assert.equal(webviewResponse.status, 302);
	assert.equal(
		webviewResponse.headers.get('location'),
		'https://example.com/primary?sub_id=webview'
	);
	if (process.argv.includes('--inspect')) {
		console.log(`Popunder inspection URL: ${baseUrl}${location}`);
		await new Promise((resolve) => setTimeout(resolve, 90_000));
	}
	console.log('Popunder Neon and public route smoke test passed.');
} finally {
	await db.delete(campaigns).where(eq(campaigns.id, campaignId));
}
