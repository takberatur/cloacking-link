import type { EvaluatedRule, RuleDecision, VisitorContext } from './types';

type IpNumber = { value: bigint; bits: 32 | 128 };

function listValues(value: string): string[] {
	return value
		.split(/[\n,]/)
		.map((item) => item.trim().toLowerCase())
		.filter(Boolean);
}

function ipv4Number(value: string): bigint | null {
	const parts = value.split('.');
	if (parts.length !== 4) return null;
	const octets = parts.map(Number);
	if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
	return octets.reduce((result, part) => result * 256n + BigInt(part), 0n);
}

function ipv6Number(value: string): bigint | null {
	const address = value.split('%')[0].toLowerCase();
	if (!address.includes(':') || address.split('::').length > 2) return null;
	const [headValue, tailValue] = address.split('::');
	const head = headValue ? headValue.split(':') : [];
	const tail = tailValue ? tailValue.split(':') : [];
	const expandIpv4 = (parts: string[]) => {
		const last = parts.at(-1);
		if (!last?.includes('.')) return parts;
		const ipv4 = ipv4Number(last);
		if (ipv4 === null) return null;
		return [
			...parts.slice(0, -1),
			((ipv4 >> 16n) & 0xffffn).toString(16),
			(ipv4 & 0xffffn).toString(16)
		];
	};
	const expandedHead = expandIpv4(head);
	const expandedTail = expandIpv4(tail);
	if (!expandedHead || !expandedTail) return null;
	const missing = 8 - expandedHead.length - expandedTail.length;
	if ((address.includes('::') && missing < 1) || (!address.includes('::') && missing !== 0)) {
		return null;
	}
	const parts = [...expandedHead, ...Array.from({ length: missing }, () => '0'), ...expandedTail];
	if (parts.length !== 8 || parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
	return parts.reduce((result, part) => (result << 16n) + BigInt(`0x${part}`), 0n);
}

function ipNumber(value: string): IpNumber | null {
	const ipv4 = ipv4Number(value);
	if (ipv4 !== null) return { value: ipv4, bits: 32 };
	const ipv6 = ipv6Number(value);
	return ipv6 === null ? null : { value: ipv6, bits: 128 };
}

function matchesCidr(ip: string, cidr: string): boolean {
	const [networkValue, prefixValue] = cidr.split('/');
	const network = ipNumber(networkValue);
	const address = ipNumber(ip);
	const prefix = Number(prefixValue);
	if (
		!network ||
		!address ||
		network.bits !== address.bits ||
		!Number.isInteger(prefix) ||
		prefix < 0 ||
		prefix > network.bits
	) {
		return false;
	}
	if (prefix === 0) return true;
	const shift = BigInt(network.bits - prefix);
	return address.value >> shift === network.value >> shift;
}

function matchesIpRange(ip: string, range: string): boolean {
	if (range.includes('/')) return matchesCidr(ip, range);
	const [startValue, endValue] = range.split('-').map((value) => value.trim());
	const address = ipNumber(ip);
	const start = ipNumber(startValue);
	const end = ipNumber(endValue);
	return Boolean(
		address &&
		start &&
		end &&
		address.bits === start.bits &&
		address.bits === end.bits &&
		address.value >= start.value &&
		address.value <= end.value
	);
}

function contextValue(type: EvaluatedRule['type'], visitor: VisitorContext): string {
	switch (type) {
		case 'country':
			return visitor.countryCode ?? '';
		case 'ip':
		case 'ip_range':
			return visitor.ip ?? '';
		case 'device':
			return visitor.deviceType;
		case 'os':
			return visitor.os;
		case 'browser':
			return visitor.browser;
		case 'bot':
			return String(visitor.isBot);
		case 'user_agent':
			return visitor.userAgent;
		case 'referrer':
			return visitor.referrer ?? '';
		case 'asn':
			return visitor.asn ?? '';
	}
}

export function ruleMatches(rule: EvaluatedRule, visitor: VisitorContext): boolean {
	const actual = contextValue(rule.type, visitor).toLowerCase();
	const values = listValues(rule.value);
	if (values.length === 0) return false;

	if (rule.type === 'ip_range' || rule.operator === 'cidr') {
		return values.some((value) => matchesIpRange(actual, value));
	}

	switch (rule.operator) {
		case 'equals':
			return values.some((value) => actual === value);
		case 'not_equals':
			return values.every((value) => actual !== value);
		case 'contains':
			return values.some((value) => actual.includes(value));
		case 'not_contains':
			return values.every((value) => !actual.includes(value));
		case 'in':
			return values.includes(actual);
		case 'not_in':
			return !values.includes(actual);
		case 'matches':
			return values.some((value) => {
				if (value.length > 256) return false;
				try {
					return new RegExp(value, 'i').test(actual);
				} catch {
					return false;
				}
			});
	}
}

export function evaluateRules(rules: EvaluatedRule[], visitor: VisitorContext): RuleDecision {
	for (const rule of rules) {
		if (ruleMatches(rule, visitor)) return { matched: true, action: rule.action, rule };
	}
	return { matched: false };
}

export function safeExternalUrl(value: string | null | undefined): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
	} catch {
		return null;
	}
}

export function withQueryParams(
	value: string,
	queryParams: Record<string, string | string[]>
): string | null {
	const safe = safeExternalUrl(value);
	if (!safe) return null;
	const url = new URL(safe);
	for (const [key, values] of Object.entries(queryParams)) {
		if (url.searchParams.has(key)) continue;
		for (const item of Array.isArray(values) ? values : [values])
			url.searchParams.append(key, item);
	}
	return url.toString();
}

export type AttributionConfig = {
	enabled: boolean;
	source: string | null;
	medium: string | null;
	campaign: string | null;
};

export function campaignQueryParams(
	queryParams: Record<string, string | string[]>,
	attribution: AttributionConfig
): Record<string, string | string[]> {
	const merged = { ...queryParams };
	if (attribution.enabled && attribution.source?.trim()) {
		merged.utm_source = attribution.source.trim();
		if (attribution.medium?.trim()) merged.utm_medium = attribution.medium.trim();
		if (attribution.campaign?.trim()) merged.utm_campaign = attribution.campaign.trim();
	}
	return merged;
}

export function withAttributionParams(
	value: string,
	queryParams: Record<string, string | string[]>,
	attribution: AttributionConfig
): string | null {
	return withQueryParams(value, campaignQueryParams(queryParams, attribution));
}
