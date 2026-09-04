import { error } from '@sveltejs/kit';
import { and, eq, gte } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { campaigns, clickEvents, destinations } from '$lib/server/db/schema';
import { withQueryParams } from '$lib/server/redirect/rules';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
	const requestId = url.searchParams.get('rid');
	if (!requestId || !UUID_PATTERN.test(requestId)) error(404, 'Safelink request not found');

	const [entry] = await db
		.select({
			campaignName: campaigns.name,
			targetUrl: destinations.url,
			preserveQueryParams: campaigns.preserveQueryParams,
			queryParams: clickEvents.queryParams,
			stripReferrer: campaigns.stripReferrer
		})
		.from(clickEvents)
		.innerJoin(campaigns, eq(campaigns.id, clickEvents.campaignId))
		.innerJoin(destinations, eq(destinations.id, clickEvents.destinationId))
		.where(
			and(
				eq(clickEvents.requestId, requestId),
				eq(clickEvents.outcome, 'safelink'),
				eq(campaigns.slug, params.slug),
				gte(clickEvents.occurredAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
			)
		)
		.limit(1);

	if (!entry) error(404, 'Safelink request not found');
	const targetUrl = withQueryParams(
		entry.targetUrl,
		entry.preserveQueryParams ? entry.queryParams : {}
	);
	if (!targetUrl) error(404, 'Destination unavailable');

	setHeaders({
		'Cache-Control': 'private, no-store',
		'X-Robots-Tag': 'noindex, nofollow',
		...(entry.stripReferrer ? { 'Referrer-Policy': 'no-referrer' } : {})
	});
	return { campaignName: entry.campaignName, targetUrl };
};
