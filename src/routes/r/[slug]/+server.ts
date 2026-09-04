import type { RequestHandler } from './$types';
import { detectVisitor } from '$lib/server/redirect/visitor';
import { resolveRedirect } from '$lib/server/redirect/engine';

const VISITOR_COOKIE = 'ls_visitor';

function requestQuery(url: URL): Record<string, string | string[]> {
	const values: Record<string, string | string[]> = {};
	for (const key of new Set(url.searchParams.keys())) {
		const all = url.searchParams.getAll(key);
		values[key] = all.length > 1 ? all : (all[0] ?? '');
	}
	return values;
}

export const GET: RequestHandler = async ({ params, request, url, cookies, getClientAddress }) => {
	let adapterAddress: string | null = null;
	try {
		adapterAddress = getClientAddress();
	} catch {
		// Some local and serverless adapters do not expose a client address.
	}

	const existingVisitorToken = cookies.get(VISITOR_COOKIE);
	const visitorToken = existingVisitorToken ?? crypto.randomUUID();
	const resolution = await resolveRedirect({
		slug: params.slug,
		visitor: detectVisitor(request.headers, adapterAddress),
		visitorToken,
		queryParams: requestQuery(url)
	});

	if (resolution.kind !== 'not_found' && !existingVisitorToken) {
		cookies.set(VISITOR_COOKIE, visitorToken, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: 60 * 60 * 24 * 365
		});
	}

	if (resolution.kind === 'not_found') {
		return new Response('Link not found or unavailable.', {
			status: resolution.status,
			headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }
		});
	}
	if (resolution.kind === 'blocked') {
		return new Response('This request is not eligible for this link.', {
			status: resolution.status,
			headers: {
				'Cache-Control': 'no-store',
				'X-Robots-Tag': 'noindex, nofollow',
				'X-Request-Id': resolution.requestId
			}
		});
	}

	return new Response(null, {
		status: resolution.status,
		headers: {
			Location: resolution.location,
			'Cache-Control': 'private, no-store',
			'X-Robots-Tag': 'noindex, nofollow',
			'X-Request-Id': resolution.requestId,
			...(resolution.stripReferrer ? { 'Referrer-Policy': 'no-referrer' } : {})
		}
	});
};
