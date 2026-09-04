import 'dotenv/config';
import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import {
	campaigns,
	clickEvents,
	destinations,
	safelinkPages,
	user
} from '../src/lib/server/db/schema';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const db = drizzle(neon(process.env.DATABASE_URL));
const [owner] = await db.select({ id: user.id }).from(user).limit(1);
if (!owner) {
	console.log('Safelink smoke test skipped: no user exists in the database.');
	process.exit(0);
}

const campaignId = crypto.randomUUID();
const destinationId = crypto.randomUUID();
const requestId = crypto.randomUUID();
const slug = `safelink-smoke-${crypto.randomUUID().slice(0, 8)}`;
const document = {
	root: {
		type: 'root',
		version: 1,
		children: [
			{
				type: 'paragraph',
				version: 1,
				children: [{ type: 'text', version: 1, text: 'Smoke test <script>alert(1)</script>' }]
			}
		]
	}
};

try {
	await db.insert(campaigns).values({
		id: campaignId,
		ownerId: owner.id,
		name: 'Safelink smoke test',
		slug,
		redirectType: 'safelink'
	});
	await db.insert(destinations).values({
		id: destinationId,
		campaignId,
		name: 'Final offer',
		url: 'https://example.com/final',
		position: 0
	});
	await db.insert(safelinkPages).values({
		campaignId,
		title: 'Draft page',
		document,
		theme: { ctaLabel: 'Continue' }
	});
	await db
		.update(safelinkPages)
		.set({ status: 'published', publishedDocument: document, publishedAt: new Date() })
		.where(eq(safelinkPages.campaignId, campaignId));

	const [page] = await db
		.select({ status: safelinkPages.status, publishedDocument: safelinkPages.publishedDocument })
		.from(safelinkPages)
		.where(eq(safelinkPages.campaignId, campaignId));
	assert.equal(page.status, 'published');
	assert.deepEqual(page.publishedDocument, document);

	const baseUrl = process.argv[2] || process.env.SAFELINK_SMOKE_BASE_URL;
	if (baseUrl) {
		await db.insert(clickEvents).values({
			requestId,
			ownerId: owner.id,
			campaignId,
			destinationId,
			outcome: 'safelink',
			redirectType: 'safelink'
		});
		const response = await fetch(`${baseUrl.replace(/\/$/, '')}/s/${slug}?rid=${requestId}`);
		const html = await response.text();
		assert.equal(response.status, 200);
		assert.match(html, /Draft page/);
		assert.match(html, /Smoke test &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
		assert.ok(!html.includes('<script>alert(1)</script>'));
		assert.match(html, /https:\/\/example\.com\/final/);
		if (process.argv.includes('--inspect')) {
			console.log(
				`Safelink inspection URL: ${baseUrl.replace(/\/$/, '')}/s/${slug}?rid=${requestId}`
			);
			await new Promise((resolve) => setTimeout(resolve, 90_000));
		}
	}
	console.log('Safelink Neon lifecycle smoke test passed.');
} finally {
	await db.delete(campaigns).where(eq(campaigns.id, campaignId));
}
