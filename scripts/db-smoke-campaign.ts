import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { and, eq, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { drizzle } from 'drizzle-orm/neon-http';
import {
	campaigns,
	destinationGeoTargets,
	destinations,
	user
} from '../src/lib/server/db/schema';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const db = drizzle(neon(process.env.DATABASE_URL));
const [owner] = await db.select({ id: user.id }).from(user).limit(1);

if (!owner) {
	console.log('Campaign smoke test skipped: no user exists in the database.');
	process.exit(0);
}

const campaignId = crypto.randomUUID();
const firstDestinationId = crypto.randomUUID();
const secondDestinationId = crypto.randomUUID();
const slug = `smoke-${crypto.randomUUID().slice(0, 8)}`;

try {
	const createStatements: BatchItem<'pg'>[] = [
		db.insert(campaigns).values({
			id: campaignId,
			ownerId: owner.id,
			name: 'Campaign smoke test',
			slug,
			status: 'draft',
			redirectType: 'direct',
			rotationStrategy: 'percentage'
		}),
		db.insert(destinations).values([
			{
				id: firstDestinationId,
				campaignId,
				name: 'Primary',
				url: 'https://example.com/primary',
				position: 0,
				weight: 60,
				geoMode: 'include'
			},
			{
				id: secondDestinationId,
				campaignId,
				name: 'Secondary',
				url: 'https://example.com/secondary',
				position: 1,
				weight: 40
			}
		]),
		db.insert(destinationGeoTargets).values({
			destinationId: firstDestinationId,
			countryCode: 'ID'
		})
	];

	await db.batch(createStatements as [BatchItem<'pg'>, ...BatchItem<'pg'>[]]);

	const [created] = await db
		.select({ destinationCount: sql<number>`count(${destinations.id})::int` })
		.from(campaigns)
		.leftJoin(destinations, eq(destinations.campaignId, campaigns.id))
		.where(and(eq(campaigns.id, campaignId), eq(campaigns.ownerId, owner.id)))
		.groupBy(campaigns.id);

	if (created?.destinationCount !== 2) {
		throw new Error('Campaign destination transaction did not persist atomically');
	}

	console.log('Campaign smoke test passed.');
} finally {
	await db.delete(campaigns).where(eq(campaigns.id, campaignId));
}
