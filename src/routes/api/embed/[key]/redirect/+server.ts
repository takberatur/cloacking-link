import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	embedSourceDomain,
	getPublicEmbed,
	isEmbedDomainAllowed,
	recordEmbedEvent,
	verifyEmbedToken
} from '$lib/server/embed';

export const GET: RequestHandler = async ({ params, request, url }) => {
	const setting = await getPublicEmbed(params.key);
	const token = verifyEmbedToken(url.searchParams.get('token') ?? '', params.key);
	const sourceDomain = embedSourceDomain(request.headers);
	if (
		!setting ||
		!setting.enabled ||
		setting.campaignStatus !== 'active' ||
		!token ||
		(sourceDomain !== null && sourceDomain !== token.domain) ||
		!isEmbedDomainAllowed(token.domain, setting.allowedDomains)
	) {
		return new Response('Embed redirect unavailable.', {
			status: 403,
			headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }
		});
	}

	try {
		await recordEmbedEvent({
			setting,
			type: 'click',
			domain: token.domain,
			pageUrl: request.headers.get('referer'),
			userAgent: request.headers.get('user-agent')
		});
	} catch (error) {
		console.error('Unable to persist embed click', { campaignId: setting.campaignId, error });
	}

	const query = setting.forwardPageQuery ? (url.searchParams.get('q') ?? '').slice(0, 2048) : '';
	redirect(
		302,
		`/r/${encodeURIComponent(setting.campaignSlug)}${query ? `?${new URLSearchParams(query).toString()}` : ''}`
	);
};
