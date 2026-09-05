import type { RequestHandler } from './$types';
import {
	embedSourceDomain,
	getPublicEmbed,
	isEmbedDomainAllowed,
	recordEmbedEvent,
	verifyEmbedToken
} from '$lib/server/embed';

function corsHeaders(origin: string | null): Record<string, string> {
	return origin
		? {
				'Access-Control-Allow-Origin': origin,
				Vary: 'Origin'
			}
		: {};
}

export const OPTIONS: RequestHandler = async ({ params, request }) => {
	const sourceDomain = embedSourceDomain(request.headers);
	const sourceOrigin = request.headers.get('origin');
	const setting = await getPublicEmbed(params.key);
	if (
		!sourceDomain ||
		!setting ||
		!setting.enabled ||
		setting.campaignStatus !== 'active' ||
		!isEmbedDomainAllowed(sourceDomain, setting.allowedDomains)
	) {
		return new Response(null, { status: 403 });
	}
	return new Response(null, {
		status: 204,
		headers: {
			...corsHeaders(sourceOrigin),
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'content-type',
			'Access-Control-Max-Age': '600'
		}
	});
};

export const POST: RequestHandler = async ({ params, request }) => {
	const sourceDomain = embedSourceDomain(request.headers);
	const sourceOrigin = request.headers.get('origin');
	const length = Number(request.headers.get('content-length') ?? 0);
	if (!sourceDomain || length > 8192) {
		return new Response(null, { status: 403, headers: corsHeaders(sourceOrigin) });
	}

	let body: { token?: unknown; type?: unknown; pageUrl?: unknown };
	try {
		const rawBody = await request.text();
		if (rawBody.length > 8192) {
			return new Response(null, { status: 413, headers: corsHeaders(sourceOrigin) });
		}
		body = JSON.parse(rawBody);
	} catch {
		return new Response(null, { status: 400, headers: corsHeaders(sourceOrigin) });
	}
	const setting = await getPublicEmbed(params.key);
	const token = typeof body.token === 'string' ? verifyEmbedToken(body.token, params.key) : null;
	if (
		!setting ||
		!setting.enabled ||
		setting.campaignStatus !== 'active' ||
		body.type !== 'impression' ||
		!token ||
		token.domain !== sourceDomain ||
		!isEmbedDomainAllowed(sourceDomain, setting.allowedDomains)
	) {
		return new Response(null, { status: 403, headers: corsHeaders(sourceOrigin) });
	}

	await recordEmbedEvent({
		setting,
		type: 'impression',
		domain: sourceDomain,
		pageUrl: typeof body.pageUrl === 'string' ? body.pageUrl : null,
		userAgent: request.headers.get('user-agent')
	});
	return new Response(null, { status: 204, headers: corsHeaders(sourceOrigin) });
};
