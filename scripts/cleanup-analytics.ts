import { neon } from '@neondatabase/serverless';
import { and, count, eq, inArray, lt, notExists } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { config } from 'dotenv';
import { auditLogs, clickEvents, embedEvents, visitors } from '../src/lib/server/db/schema.ts';

config({ quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

function positiveInteger(value: string | undefined, fallback: number, maximum: number) {
	const parsed = Number.parseInt(value ?? '', 10);
	return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function cutoff(days: number) {
	return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

const execute = process.argv.includes('--execute');
const batchSize = positiveInteger(process.env.ANALYTICS_CLEANUP_BATCH_SIZE, 1_000, 10_000);
const clickCutoff = cutoff(positiveInteger(process.env.CLICK_EVENT_RETENTION_DAYS, 180, 3_650));
const embedCutoff = cutoff(positiveInteger(process.env.EMBED_EVENT_RETENTION_DAYS, 180, 3_650));
const visitorCutoff = cutoff(positiveInteger(process.env.VISITOR_RETENTION_DAYS, 365, 3_650));
const auditCutoff = cutoff(positiveInteger(process.env.AUDIT_LOG_RETENTION_DAYS, 365, 3_650));
const db = drizzle(neon(databaseUrl));

async function counts() {
	const [clickRows, embedRows, visitorRows, auditRows] = await Promise.all([
		db.select({ total: count() }).from(clickEvents).where(lt(clickEvents.occurredAt, clickCutoff)),
		db.select({ total: count() }).from(embedEvents).where(lt(embedEvents.occurredAt, embedCutoff)),
		db
			.select({ total: count() })
			.from(visitors)
			.where(
				and(
					lt(visitors.lastSeenAt, visitorCutoff),
					notExists(
						db
							.select({ id: clickEvents.id })
							.from(clickEvents)
							.where(eq(clickEvents.visitorId, visitors.id))
					)
				)
			),
		db.select({ total: count() }).from(auditLogs).where(lt(auditLogs.createdAt, auditCutoff))
	]);
	return {
		clickEvents: clickRows[0]?.total ?? 0,
		embedEvents: embedRows[0]?.total ?? 0,
		orphanVisitors: visitorRows[0]?.total ?? 0,
		auditLogs: auditRows[0]?.total ?? 0
	};
}

async function deleteInBatches(run: () => Promise<{ id: string }[]>) {
	let total = 0;
	while (true) {
		const rows = await run();
		total += rows.length;
		if (rows.length < batchSize) return total;
	}
}

const pending = await counts();
if (!execute) {
	console.log('Analytics cleanup dry run. Pass --execute to delete rows.', pending);
}

if (execute) {
	const deletedClickEvents = await deleteInBatches(() =>
		db
			.delete(clickEvents)
			.where(
				inArray(
					clickEvents.id,
					db
						.select({ id: clickEvents.id })
						.from(clickEvents)
						.where(lt(clickEvents.occurredAt, clickCutoff))
						.limit(batchSize)
				)
			)
			.returning({ id: clickEvents.id })
	);
	const deletedEmbedEvents = await deleteInBatches(() =>
		db
			.delete(embedEvents)
			.where(
				inArray(
					embedEvents.id,
					db
						.select({ id: embedEvents.id })
						.from(embedEvents)
						.where(lt(embedEvents.occurredAt, embedCutoff))
						.limit(batchSize)
				)
			)
			.returning({ id: embedEvents.id })
	);
	const deletedVisitors = await deleteInBatches(() =>
		db
			.delete(visitors)
			.where(
				inArray(
					visitors.id,
					db
						.select({ id: visitors.id })
						.from(visitors)
						.where(
							and(
								lt(visitors.lastSeenAt, visitorCutoff),
								notExists(
									db
										.select({ id: clickEvents.id })
										.from(clickEvents)
										.where(eq(clickEvents.visitorId, visitors.id))
								)
							)
						)
						.limit(batchSize)
				)
			)
			.returning({ id: visitors.id })
	);
	const deletedAuditLogs = await deleteInBatches(() =>
		db
			.delete(auditLogs)
			.where(
				inArray(
					auditLogs.id,
					db
						.select({ id: auditLogs.id })
						.from(auditLogs)
						.where(lt(auditLogs.createdAt, auditCutoff))
						.limit(batchSize)
				)
			)
			.returning({ id: auditLogs.id })
	);

	console.log('Analytics cleanup complete.', {
		deletedClickEvents,
		deletedEmbedEvents,
		deletedVisitors,
		deletedAuditLogs
	});
}
