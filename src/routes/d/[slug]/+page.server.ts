import { error } from '@sveltejs/kit';
import { and, eq, gte } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { campaigns, clickEvents, destinationDeepLinks, destinations } from '$lib/server/db/schema';
import { createDeepLinkPlan } from '$lib/server/redirect/deeplink';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
	const requestId = url.searchParams.get('rid');
	if (!requestId || !UUID_PATTERN.test(requestId)) error(404, 'Deeplink request not found');

	const [entry] = await db
		.select({
			campaignName: campaigns.name,
			destinationName: destinations.name,
			destinationUrl: destinations.url,
			preserveQueryParams: campaigns.preserveQueryParams,
			queryParams: clickEvents.queryParams,
			os: clickEvents.os,
			browser: clickEvents.browser,
			androidScheme: destinationDeepLinks.androidScheme,
			androidPackageName: destinationDeepLinks.androidPackageName,
			androidStoreUrl: destinationDeepLinks.androidStoreUrl,
			iosScheme: destinationDeepLinks.iosScheme,
			iosAppId: destinationDeepLinks.iosAppId,
			iosStoreUrl: destinationDeepLinks.iosStoreUrl,
			universalLink: destinationDeepLinks.universalLink,
			webFallbackUrl: destinationDeepLinks.webFallbackUrl
		})
		.from(clickEvents)
		.innerJoin(campaigns, eq(campaigns.id, clickEvents.campaignId))
		.innerJoin(destinations, eq(destinations.id, clickEvents.destinationId))
		.innerJoin(destinationDeepLinks, eq(destinationDeepLinks.destinationId, destinations.id))
		.where(
			and(
				eq(clickEvents.requestId, requestId),
				eq(clickEvents.redirectType, 'deeplink'),
				eq(campaigns.slug, params.slug),
				gte(clickEvents.occurredAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
			)
		)
		.limit(1);

	if (!entry) error(404, 'Deeplink request not found');
	const plan = createDeepLinkPlan({
		os: entry.os ?? 'Unknown',
		browser: entry.browser ?? 'Unknown',
		destinationUrl: entry.destinationUrl,
		config: entry,
		queryParams: entry.preserveQueryParams ? entry.queryParams : {}
	});

	setHeaders({
		'Cache-Control': 'private, no-store',
		'X-Robots-Tag': 'noindex, nofollow',
		'Referrer-Policy': 'no-referrer'
	});
	return {
		requestId,
		campaignName: entry.campaignName,
		destinationName: entry.destinationName,
		plan
	};
};
