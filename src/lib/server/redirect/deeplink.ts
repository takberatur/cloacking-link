import { safeExternalUrl, withQueryParams } from './rules';

export type DeepLinkConfig = {
	androidScheme: string | null;
	androidPackageName: string | null;
	androidStoreUrl: string | null;
	iosScheme: string | null;
	iosAppId: string | null;
	iosStoreUrl: string | null;
	universalLink: string | null;
	webFallbackUrl: string | null;
};

export type DeepLinkPlan = {
	platform: 'android' | 'ios' | 'web';
	launchUrl: string;
	fallbackUrl: string;
	webUrl: string;
	storeUrl: string | null;
	shouldFallback: boolean;
	fallbackDelayMs: number;
	isWebView: boolean;
};

type QueryValues = Record<string, string | string[]>;

export function safeAppUrl(value: string | null | undefined): string | null {
	if (!value || value.length > 2048 || /\s/.test(value) || value.includes('#Intent;')) return null;
	const match = value.match(/^([a-z][a-z0-9+.-]*):\/\/(.+)$/i);
	if (!match) return null;
	const protocol = `${match[1].toLowerCase()}:`;
	if (['javascript:', 'data:', 'file:', 'vbscript:'].includes(protocol)) return null;
	return value;
}

function withAppQuery(value: string | null, query: QueryValues): string | null {
	const safe = safeAppUrl(value);
	if (!safe) return null;
	try {
		const url = new URL(safe);
		for (const [key, values] of Object.entries(query)) {
			if (url.searchParams.has(key)) continue;
			for (const item of Array.isArray(values) ? values : [values]) {
				url.searchParams.append(key, item);
			}
		}
		return url.toString();
	} catch {
		return safe;
	}
}

function androidStoreUrl(config: DeepLinkConfig): string | null {
	return (
		safeExternalUrl(config.androidStoreUrl) ||
		(config.androidPackageName
			? `https://play.google.com/store/apps/details?id=${encodeURIComponent(config.androidPackageName)}`
			: null)
	);
}

function iosStoreUrl(config: DeepLinkConfig): string | null {
	return (
		safeExternalUrl(config.iosStoreUrl) ||
		(config.iosAppId ? `https://apps.apple.com/app/id${encodeURIComponent(config.iosAppId)}` : null)
	);
}

export function buildAndroidIntent(
	appUrl: string,
	packageName: string,
	fallbackUrl: string
): string | null {
	const safe = safeAppUrl(appUrl);
	if (!safe || !/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/.test(packageName)) return null;
	const match = safe.match(/^([a-z][a-z0-9+.-]*):\/\/(.+)$/i);
	if (!match) return null;
	return `intent://${match[2]}#Intent;scheme=${match[1]};package=${packageName};S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
}

export function createDeepLinkPlan(input: {
	os: string;
	browser: string;
	destinationUrl: string;
	config: DeepLinkConfig;
	queryParams?: QueryValues;
}): DeepLinkPlan {
	const query = input.queryParams ?? {};
	const destination = withQueryParams(input.destinationUrl, query) ?? input.destinationUrl;
	const universal = input.config.universalLink
		? withQueryParams(input.config.universalLink, query)
		: null;
	const webFallback = input.config.webFallbackUrl
		? withQueryParams(input.config.webFallbackUrl, query)
		: null;
	const web = webFallback ?? universal ?? destination;
	const isWebView = /WebView/i.test(input.browser);

	if (input.os === 'Android') {
		const store = androidStoreUrl(input.config);
		const app = withAppQuery(input.config.androidScheme, query) ?? universal;
		const fallback = store ?? web;
		const intent =
			app && input.config.androidPackageName
				? buildAndroidIntent(app, input.config.androidPackageName, fallback)
				: null;
		return {
			platform: 'android',
			launchUrl: intent ?? app ?? web,
			fallbackUrl: fallback,
			webUrl: web,
			storeUrl: store,
			shouldFallback: Boolean(app && !intent),
			fallbackDelayMs: 1800,
			isWebView
		};
	}

	if (input.os === 'iOS') {
		const store = iosStoreUrl(input.config);
		const app = withAppQuery(input.config.iosScheme, query) ?? universal;
		return {
			platform: 'ios',
			launchUrl: app ?? web,
			fallbackUrl: store ?? web,
			webUrl: web,
			storeUrl: store,
			shouldFallback: Boolean(app && input.config.iosScheme),
			fallbackDelayMs: 1800,
			isWebView
		};
	}

	return {
		platform: 'web',
		launchUrl: web,
		fallbackUrl: web,
		webUrl: web,
		storeUrl: null,
		shouldFallback: false,
		fallbackDelayMs: 0,
		isWebView
	};
}
