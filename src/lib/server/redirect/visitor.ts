import type { DeviceType, VisitorContext } from './types';

function firstHeaderValue(value: string | null): string | null {
	return value?.split(',')[0]?.trim() || null;
}

function normalizedCode(value: string | null, maxLength: number): string | null {
	const normalized = value?.trim().toUpperCase();
	return normalized && normalized.length <= maxLength ? normalized : null;
}

export function extractClientIp(headers: Headers, adapterAddress?: string | null): string | null {
	const value =
		firstHeaderValue(headers.get('cf-connecting-ip')) ??
		firstHeaderValue(headers.get('x-vercel-forwarded-for')) ??
		firstHeaderValue(headers.get('x-forwarded-for')) ??
		firstHeaderValue(headers.get('x-real-ip')) ??
		adapterAddress?.trim() ??
		null;

	if (!value) return null;
	const withoutMappedPrefix = value.replace(/^::ffff:/i, '');
	return withoutMappedPrefix.startsWith('[')
		? withoutMappedPrefix.slice(1, withoutMappedPrefix.indexOf(']'))
		: withoutMappedPrefix.split(':').length === 2
			? withoutMappedPrefix.split(':')[0]
			: withoutMappedPrefix;
}

function detectOs(userAgent: string): string {
	if (/android/i.test(userAgent)) return 'Android';
	if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS';
	if (/windows nt/i.test(userAgent)) return 'Windows';
	if (/mac os x|macintosh/i.test(userAgent)) return 'macOS';
	if (/cros/i.test(userAgent)) return 'Chrome OS';
	if (/linux/i.test(userAgent)) return 'Linux';
	return 'Unknown';
}

function detectBrowser(userAgent: string): string {
	if (/FBAN|FBAV/i.test(userAgent)) return 'Facebook WebView';
	if (/Instagram/i.test(userAgent)) return 'Instagram WebView';
	if (/TikTok/i.test(userAgent)) return 'TikTok WebView';
	if (/SamsungBrowser/i.test(userAgent)) return 'Samsung Internet';
	if (/EdgA?|EdgiOS/i.test(userAgent)) return 'Edge';
	if (/OPR|Opera/i.test(userAgent)) return 'Opera';
	if (/CriOS|Chrome/i.test(userAgent)) return 'Chrome';
	if (/FxiOS|Firefox/i.test(userAgent)) return 'Firefox';
	if (/Safari/i.test(userAgent)) return 'Safari';
	return 'Unknown';
}

function detectDevice(userAgent: string): DeviceType {
	if (!userAgent) return 'unknown';
	if (/ipad|tablet|kindle|silk/i.test(userAgent)) return 'tablet';
	if (/mobile|iphone|ipod|android/i.test(userAgent)) return 'mobile';
	return 'desktop';
}

function detectBot(userAgent: string): { isBot: boolean; botScore: number } {
	if (!userAgent) return { isBot: true, botScore: 70 };
	if (/bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp/i.test(userAgent)) {
		return { isBot: true, botScore: 100 };
	}
	if (/headlesschrome|phantomjs|selenium|playwright|puppeteer/i.test(userAgent)) {
		return { isBot: true, botScore: 90 };
	}
	if (/curl|wget|python-requests|httpclient|postmanruntime/i.test(userAgent)) {
		return { isBot: true, botScore: 75 };
	}
	return { isBot: false, botScore: 0 };
}

export function detectVisitor(headers: Headers, adapterAddress?: string | null): VisitorContext {
	const userAgent = headers.get('user-agent')?.slice(0, 2048) ?? '';
	const bot = detectBot(userAgent);

	return {
		ip: extractClientIp(headers, adapterAddress),
		countryCode: normalizedCode(
			headers.get('cf-ipcountry') ?? headers.get('x-vercel-ip-country'),
			2
		),
		regionCode: normalizedCode(headers.get('x-vercel-ip-country-region'), 16),
		city: headers.get('x-vercel-ip-city')?.slice(0, 120) ?? null,
		timezone: headers.get('x-vercel-ip-timezone')?.slice(0, 64) ?? null,
		deviceType: detectDevice(userAgent),
		os: detectOs(userAgent),
		browser: detectBrowser(userAgent),
		userAgent,
		referrer: headers.get('referer')?.slice(0, 2048) ?? null,
		language: firstHeaderValue(headers.get('accept-language'))?.slice(0, 32) ?? null,
		asn: firstHeaderValue(headers.get('cf-asn') ?? headers.get('x-vercel-ip-as-number')),
		...bot
	};
}
