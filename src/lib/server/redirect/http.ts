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

function renderZeroUiAutoRedirect(input: {
	primaryUrl: string;
	secondTarget: {
		targetUrl: string;
		behavior: string;
		delayMs: number;
		frequencyCap: number;
		frequencyWindowHours: number;
		campaignId: string;
	};
	stripReferrer: boolean;
}): string {
	const jsonConfig = JSON.stringify(input);
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex,nofollow">
${input.stripReferrer ? '<meta name="referrer" content="no-referrer">' : ''}
<title>Redirecting...</title>
<style>body{margin:0;padding:0;background:transparent;overflow:hidden;}</style>
</head>
<body>
<script>
(function() {
	var cfg = ${jsonConfig};
	var primary = cfg.primaryUrl;
	var sec = cfg.secondTarget;
	var capKey = "ls:popunder:" + sec.campaignId;
	function goPrimary() {
		window.location.replace(primary);
	}
	// 1. Evaluasi Frequency Cap di LocalStorage
	var allowSecond = true;
	try {
		var history = JSON.parse(localStorage.getItem(capKey) || "[]");
		var cutoff = Date.now() - (sec.frequencyWindowHours * 3600000);
		var valid = history.filter(function(ts) { return typeof ts === "number" && ts >= cutoff; });
		if (valid.length >= sec.frequencyCap) {
			allowSecond = false;
		} else {
			valid.push(Date.now());
			localStorage.setItem(capKey, JSON.stringify(valid));
		}
	} catch (e) {
		allowSecond = true;
	}
	if (!allowSecond) {
		goPrimary();
		return;
	}
	// 2. Eksekusi sesuai Behavior yang dipilih
	if (sec.behavior === 'same_tab') {
		// History Trapping: Saat user menekan tombol Back, Second Target URL akan terbuka
		try {
			history.replaceState(null, '', sec.targetUrl);
			history.pushState(null, '', window.location.href);
		} catch(e) {}
		goPrimary();
	} else if (sec.behavior === 'new_tab') {
		// Buka Second Target di tab baru, tab utama ke destinasi rotator
		try {
			var w = window.open(sec.targetUrl, '_blank');
			if (w) w.opener = null;
		} catch (e) {}
		if (sec.delayMs > 0) {
			setTimeout(goPrimary, sec.delayMs);
		} else {
			goPrimary();
		}
	} else if (sec.behavior === 'background') {
		// Buka destinasi utama di tab baru, tab ini membuka Second Target URL
		try {
			var w = window.open(primary, '_blank');
			if (w) {
				w.opener = null;
				if (sec.delayMs > 0) {
					setTimeout(function() { window.location.replace(sec.targetUrl); }, sec.delayMs);
				} else {
					window.location.replace(sec.targetUrl);
				}
				return;
			}
		} catch (e) {}
		// Fallback jika popup blocker aktif
		goPrimary();
	} else {
		goPrimary();
	}
})();
</script>
</body>
</html>`;
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

	if (resolution.kind === 'direct_with_second_target') {
		const html = renderZeroUiAutoRedirect({
			primaryUrl: resolution.primaryUrl,
			secondTarget: resolution.secondTarget,
			stripReferrer: resolution.stripReferrer
		});
		return new Response(html, {
			status: 200,
			headers: {
				...responseHeaders,
				'Content-Type': 'text/html; charset=utf-8',
				'Cache-Control': 'private, no-store',
				'X-Robots-Tag': 'noindex, nofollow',
				...(resolution.stripReferrer ? { 'Referrer-Policy': 'no-referrer' } : {})
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
