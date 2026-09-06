import type { RequestEvent } from '@sveltejs/kit';
import { logEvent, positiveIntegerEnv } from '$lib/server/observability';
import { resolveRedirect } from './engine';
import { enforceRedirectRateLimit } from './rate-limit';
import { detectVisitor } from './visitor';

const VISITOR_COOKIE = 'ls_visitor';

function requestQuery(url: URL): Record<string, string | string[]> {
	const values: Record<string, string | string[]> = {};
	for (const key of new Set(url.searchParams.keys())) {
		const all = url.searchParams.getAll(key);
		values[key] = all.length > 1 ? all : (all[0] ?? '');
	}
	return values;
}

export async function handlePublicRedirect(event: RequestEvent, slug: string) {
	const { request, url, cookies, getClientAddress } = event;
	const startedAt = performance.now();
	let adapterAddress: string | null = null;
	try {
		adapterAddress = getClientAddress();
	} catch {
		// Some local and serverless adapters do not expose a client address.
	}

	const existingVisitorToken = cookies.get(VISITOR_COOKIE);
	const visitorToken = existingVisitorToken ?? crypto.randomUUID();
	const visitor = detectVisitor(request.headers, adapterAddress);
	const rateLimit = await enforceRedirectRateLimit(
		slug,
		visitor.ip ?? existingVisitorToken ?? visitorToken
	);
	const rateHeaders = {
		'RateLimit-Limit': String(rateLimit.limit),
		'RateLimit-Remaining': String(rateLimit.remaining),
		'RateLimit-Reset': String(rateLimit.retryAfter)
	};
	if (!rateLimit.allowed) {
		const requestId = crypto.randomUUID();
		logEvent('warn', 'redirect.rate_limited', { requestId, slug });
		return new Response('Too many requests.', {
			status: 429,
			headers: {
				...rateHeaders,
				'Retry-After': String(rateLimit.retryAfter),
				'Cache-Control': 'no-store',
				'X-Robots-Tag': 'noindex, nofollow',
				'X-Request-Id': requestId
			}
		});
	}

	const resolution = await resolveRedirect({
		slug,
		visitor,
		visitorToken,
		queryParams: requestQuery(url)
	});
	const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
	const slowThresholdMs = positiveIntegerEnv('SLOW_REDIRECT_THRESHOLD_MS', 500, 30_000);
	logEvent(durationMs >= slowThresholdMs ? 'warn' : 'info', 'redirect.completed', {
		requestId: resolution.requestId,
		slug,
		outcome: resolution.kind,
		durationMs,
		riskScore: visitor.riskScore,
		isBot: visitor.isBot
	});
	const responseHeaders = {
		...rateHeaders,
		'Server-Timing': `total;dur=${durationMs}`,
		'X-Request-Id': resolution.requestId
	};

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
			headers: {
				...responseHeaders,
				'Cache-Control': 'no-store',
				'X-Robots-Tag': 'noindex, nofollow'
			}
		});
	}
	if (resolution.kind === 'blocked') {
		return new Response('This request is not eligible for this link.', {
			status: resolution.status,
			headers: {
				...responseHeaders,
				'Cache-Control': 'no-store',
				'X-Robots-Tag': 'noindex, nofollow'
			}
		});
	}

	return new Response(null, {
		status: resolution.status,
		headers: {
			...responseHeaders,
			Location: resolution.location,
			'Cache-Control': 'private, no-store',
			'X-Robots-Tag': 'noindex, nofollow',
			...(resolution.stripReferrer ? { 'Referrer-Policy': 'no-referrer' } : {})
		}
	});
}
