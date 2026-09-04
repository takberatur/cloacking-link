import type { RequestHandler } from './$types';
import {
	buildEmbedScript,
	createEmbedToken,
	embedSourceDomain,
	getPublicEmbed,
	isEmbedDomainAllowed
} from '$lib/server/embed';

export const GET: RequestHandler = async ({ params, request, url }) => {
	const setting = await getPublicEmbed(params.key);
	const domain = embedSourceDomain(request.headers);
	if (
		!setting ||
		!setting.enabled ||
		setting.campaignStatus !== 'active' ||
		!domain ||
		!isEmbedDomainAllowed(domain, setting.allowedDomains)
	) {
		return new Response('/* LinkShift embed unavailable */', {
			status: 404,
			headers: {
				'Content-Type': 'application/javascript; charset=utf-8',
				'Cache-Control': 'no-store'
			}
		});
	}

	const body = buildEmbedScript({
		baseUrl: url.origin,
		publicKey: setting.publicKey,
		token: createEmbedToken(setting.publicKey, domain),
		selector: setting.selector,
		rewriteLinks: setting.rewriteLinks,
		forwardPageQuery: setting.forwardPageQuery
	});
	return new Response(body, {
		headers: {
			'Content-Type': 'application/javascript; charset=utf-8',
			'Cache-Control': 'private, no-store',
			'Cross-Origin-Resource-Policy': 'cross-origin',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
