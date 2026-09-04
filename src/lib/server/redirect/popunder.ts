import { safeExternalUrl } from './rules';

export type PopunderBehavior = 'background' | 'new_tab' | 'same_tab';
export type PopunderBrowserBehavior = 'inherit' | 'disabled' | PopunderBehavior;

export type PopunderPlan = {
	targetUrl: string;
	behavior: PopunderBehavior;
	delayMs: number;
	frequencyCap: number;
	frequencyWindowHours: number;
	isWebView: boolean;
};

const behaviors = new Set<PopunderBehavior>(['background', 'new_tab', 'same_tab']);
const browserBehaviors = new Set<PopunderBrowserBehavior>(['inherit', 'disabled', ...behaviors]);

function browserRule(
	rules: Record<string, unknown>,
	key: 'desktop' | 'mobile' | 'webview'
): PopunderBrowserBehavior {
	const value = rules[key];
	return browserBehaviors.has(value as PopunderBrowserBehavior)
		? (value as PopunderBrowserBehavior)
		: 'inherit';
}

export function isSocialWebView(browser: string): boolean {
	return /webview|facebook|instagram|tiktok/i.test(browser);
}

export function createPopunderPlan(input: {
	enabled: boolean;
	targetUrl: string;
	behavior: string;
	delayMs: number;
	frequencyCap: number;
	frequencyWindowHours: number;
	browserRules: Record<string, unknown>;
	browser: string;
	deviceType: string;
}): PopunderPlan | null {
	if (!input.enabled) return null;
	const targetUrl = safeExternalUrl(input.targetUrl);
	if (!targetUrl) return null;

	const isWebView = isSocialWebView(input.browser);
	const deviceRule = isWebView
		? browserRule(input.browserRules, 'webview')
		: browserRule(input.browserRules, input.deviceType === 'desktop' ? 'desktop' : 'mobile');
	if (deviceRule === 'disabled') return null;

	const fallbackBehavior = behaviors.has(input.behavior as PopunderBehavior)
		? (input.behavior as PopunderBehavior)
		: 'background';

	return {
		targetUrl,
		behavior: deviceRule === 'inherit' ? fallbackBehavior : deviceRule,
		delayMs: Math.max(0, Math.min(10000, input.delayMs)),
		frequencyCap: Math.max(1, Math.min(100, input.frequencyCap)),
		frequencyWindowHours: Math.max(1, Math.min(720, input.frequencyWindowHours)),
		isWebView
	};
}
