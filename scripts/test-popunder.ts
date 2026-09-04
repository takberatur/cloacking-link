import assert from 'node:assert/strict';
import { createPopunderPlan, isSocialWebView } from '../src/lib/server/redirect/popunder';
import { campaignSchema } from '../src/lib/utils/validators';

const base = {
	enabled: true,
	targetUrl: 'https://second.example/offer',
	behavior: 'background',
	delayMs: 250,
	frequencyCap: 2,
	frequencyWindowHours: 12,
	browserRules: { desktop: 'inherit', mobile: 'new_tab', webview: 'same_tab' }
};

const desktop = createPopunderPlan({
	...base,
	browser: 'Chrome',
	deviceType: 'desktop'
});
assert.ok(desktop);
assert.equal(desktop.behavior, 'background');
assert.equal(desktop.targetUrl, base.targetUrl);

const mobile = createPopunderPlan({ ...base, browser: 'Safari', deviceType: 'mobile' });
assert.ok(mobile);
assert.equal(mobile.behavior, 'new_tab');

const webview = createPopunderPlan({
	...base,
	browser: 'Instagram WebView',
	deviceType: 'mobile'
});
assert.ok(webview);
assert.equal(webview.behavior, 'same_tab');
assert.equal(webview.isWebView, true);
assert.equal(isSocialWebView('TikTok WebView'), true);

assert.equal(
	createPopunderPlan({
		...base,
		browser: 'Chrome',
		deviceType: 'mobile',
		browserRules: { mobile: 'disabled' }
	}),
	null
);
assert.equal(
	createPopunderPlan({
		...base,
		targetUrl: 'javascript:alert(1)',
		browser: 'Chrome',
		deviceType: 'desktop'
	}),
	null
);

const invalidUntrackedCampaign = campaignSchema.safeParse({
	name: 'Popunder campaign',
	slug: 'popunder-campaign',
	description: '',
	status: 'draft',
	redirectType: 'direct',
	rotationStrategy: 'equal',
	fallbackUrl: '',
	botProtectionEnabled: true,
	trackingEnabled: false,
	preserveQueryParams: true,
	stripReferrer: false,
	popunder: {
		enabled: true,
		targetUrl: 'https://second.example/offer',
		behavior: 'background',
		delayMs: 0,
		frequencyCap: 1,
		frequencyWindowHours: 24,
		browserRules: { desktop: 'inherit', mobile: 'inherit', webview: 'same_tab' }
	},
	destinations: [
		{
			name: 'Primary',
			url: 'https://primary.example/offer',
			type: 'affiliate',
			platform: 'generic',
			enabled: true,
			weight: 100,
			priority: 0,
			geoMode: 'all',
			countries: [],
			deepLink: {
				enabled: false,
				androidScheme: '',
				androidPackageName: '',
				androidStoreUrl: '',
				iosScheme: '',
				iosAppId: '',
				iosStoreUrl: '',
				universalLink: '',
				webFallbackUrl: ''
			}
		}
	]
});
assert.equal(invalidUntrackedCampaign.success, false);
assert.match(
	JSON.stringify(invalidUntrackedCampaign.error?.flatten()),
	/Analytics tracking is required/
);

console.log('Popunder planner tests passed.');
