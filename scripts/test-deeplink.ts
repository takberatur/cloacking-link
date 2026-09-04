import assert from 'node:assert/strict';
import {
	buildAndroidIntent,
	createDeepLinkPlan,
	safeAppUrl
} from '../src/lib/server/redirect/deeplink.ts';

assert.equal(safeAppUrl('javascript://alert(1)'), null);
assert.equal(safeAppUrl('data://text/html,attack'), null);
assert.equal(safeAppUrl('shopee://product/123'), 'shopee://product/123');
assert.equal(safeAppUrl('broken value'), null);

const android = createDeepLinkPlan({
	os: 'Android',
	browser: 'Chrome',
	destinationUrl: 'https://shop.example/offer',
	queryParams: { sub_id: 'visitor-1' },
	config: {
		androidScheme: 'shopapp://offer/42',
		androidPackageName: 'com.example.shop',
		androidStoreUrl: null,
		iosScheme: null,
		iosAppId: null,
		iosStoreUrl: null,
		universalLink: null,
		webFallbackUrl: null
	}
});
assert.equal(android.platform, 'android');
assert.match(android.launchUrl, /^intent:\/\/offer\/42\?sub_id=visitor-1#Intent;/);
assert.match(android.launchUrl, /package=com\.example\.shop/);
assert.match(android.fallbackUrl, /play\.google\.com\/store\/apps\/details/);
assert.equal(android.webUrl, 'https://shop.example/offer?sub_id=visitor-1');
assert.equal(android.shouldFallback, false);

const ios = createDeepLinkPlan({
	os: 'iOS',
	browser: 'Instagram WebView',
	destinationUrl: 'https://shop.example/offer',
	config: {
		androidScheme: null,
		androidPackageName: null,
		androidStoreUrl: null,
		iosScheme: 'shopapp://offer/42',
		iosAppId: '123456789',
		iosStoreUrl: null,
		universalLink: 'https://app.example/offer/42',
		webFallbackUrl: null
	}
});
assert.equal(ios.platform, 'ios');
assert.equal(ios.launchUrl, 'shopapp://offer/42');
assert.equal(ios.fallbackUrl, 'https://apps.apple.com/app/id123456789');
assert.equal(ios.webUrl, 'https://app.example/offer/42');
assert.equal(ios.shouldFallback, true);
assert.equal(ios.isWebView, true);

const web = createDeepLinkPlan({
	os: 'Windows',
	browser: 'Chrome',
	destinationUrl: 'https://shop.example/offer',
	queryParams: { source: 'affiliate' },
	config: {
		androidScheme: null,
		androidPackageName: null,
		androidStoreUrl: null,
		iosScheme: null,
		iosAppId: null,
		iosStoreUrl: null,
		universalLink: 'https://app.example/offer',
		webFallbackUrl: 'https://fallback.example/offer'
	}
});
assert.equal(web.platform, 'web');
assert.equal(web.launchUrl, 'https://fallback.example/offer?source=affiliate');

assert.equal(
	buildAndroidIntent('javascript://attack', 'com.example.app', 'https://example.com'),
	null
);
console.log('Deeplink planner tests passed.');
