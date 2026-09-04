import { error } from '@sveltejs/kit';
import { and, eq, gte } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	campaigns,
	clickEvents,
	destinationDeepLinks,
	destinations,
	popunderSettings
} from '$lib/server/db/schema';
import { createPopunderPlan } from '$lib/server/redirect/popunder';
import { withQueryParams } from '$lib/server/redirect/rules';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
	const requestId = url.searchParams.get('rid');
	if (
		!requestId ||
		!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)
	) {
		error(404, 'Popunder launch not found');
	}

	const [row] = await db
		.select({
			campaignId: campaigns.id,
			campaignName: campaigns.name,
			campaignSlug: campaigns.slug,
			redirectType: campaigns.redirectType,
			preserveQueryParams: campaigns.preserveQueryParams,
			destinationUrl: destinations.url,
			deepLinkId: destinationDeepLinks.id,
			queryParams: clickEvents.queryParams,
			browser: clickEvents.browser,
			deviceType: clickEvents.deviceType,
			enabled: popunderSettings.enabled,
			targetUrl: popunderSettings.targetUrl,
			behavior: popunderSettings.behavior,
			delayMs: popunderSettings.delayMs,
			frequencyCap: popunderSettings.frequencyCap,
			frequencyWindowHours: popunderSettings.frequencyWindowHours,
			browserRules: popunderSettings.browserRules
		})
		.from(clickEvents)
		.innerJoin(campaigns, eq(campaigns.id, clickEvents.campaignId))
		.innerJoin(destinations, eq(destinations.id, clickEvents.destinationId))
		.innerJoin(popunderSettings, eq(popunderSettings.campaignId, campaigns.id))
		.leftJoin(destinationDeepLinks, eq(destinationDeepLinks.destinationId, destinations.id))
		.where(
			and(
				eq(clickEvents.requestId, requestId),
				eq(campaigns.slug, params.slug),
				gte(clickEvents.occurredAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
			)
		)
		.limit(1);

	if (!row) error(404, 'Popunder launch not found');
	const plan = createPopunderPlan({
		enabled: row.enabled,
		targetUrl: row.targetUrl,
		behavior: row.behavior,
		delayMs: row.delayMs,
		frequencyCap: row.frequencyCap,
		frequencyWindowHours: row.frequencyWindowHours,
		browserRules: row.browserRules,
		browser: row.browser ?? 'Unknown',
		deviceType: row.deviceType ?? 'unknown'
	});
	if (!plan) error(404, 'Popunder launch is unavailable');

	const queryParams = (row.queryParams ?? {}) as Record<string, string | string[]>;
	const primaryUrl =
		row.redirectType === 'safelink'
			? `/s/${encodeURIComponent(row.campaignSlug)}?rid=${encodeURIComponent(requestId)}`
			: row.redirectType === 'deeplink' && row.deepLinkId
				? `/d/${encodeURIComponent(row.campaignSlug)}?rid=${encodeURIComponent(requestId)}`
				: withQueryParams(row.destinationUrl, row.preserveQueryParams ? queryParams : {});
	if (!primaryUrl) error(404, 'Primary destination is unavailable');

	setHeaders({
		'Cache-Control': 'private, no-store',
		'X-Robots-Tag': 'noindex, nofollow',
		'Referrer-Policy': 'no-referrer'
	});

	return {
		campaignId: row.campaignId,
		campaignName: row.campaignName,
		requestId,
		primaryUrl,
		plan
	};
};
