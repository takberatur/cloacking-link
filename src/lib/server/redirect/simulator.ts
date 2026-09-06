import { and, asc, eq, isNull, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { getCampaign } from '$lib/server/campaign';
import { blockRules } from '$lib/server/db/schema';
import { detectVisitor } from './visitor';
import { evaluateRules, safeExternalUrl, withAttributionParams } from './rules';
import { selectDestination } from './rotation';
import type { EvaluatedRule } from './types';

export type SimulationInput = {
	ip: string;
	countryCode: string;
	userAgent: string;
	referrer: string;
	language: string;
};

export async function simulateCampaignRedirect(
	userId: string,
	campaignId: string,
	input: SimulationInput,
	now = new Date()
) {
	const campaign = await getCampaign(userId, campaignId);
	if (!campaign) return null;
	const headers = new Headers({
		'user-agent': input.userAgent,
		accept: 'text/html,application/xhtml+xml',
		'accept-language': input.language || 'en',
		...(input.countryCode ? { 'cf-ipcountry': input.countryCode } : {}),
		...(input.referrer ? { referer: input.referrer } : {})
	});
	const visitor = detectVisitor(headers, input.ip || null);
	const rows = await db
		.select({
			id: blockRules.id,
			campaignId: blockRules.campaignId,
			type: blockRules.type,
			operator: blockRules.operator,
			action: blockRules.action,
			value: blockRules.value,
			redirectUrl: blockRules.redirectUrl,
			position: blockRules.position
		})
		.from(blockRules)
		.where(
			and(
				eq(blockRules.ownerId, campaign.ownerId),
				eq(blockRules.enabled, true),
				or(eq(blockRules.campaignId, campaign.id), isNull(blockRules.campaignId))
			)
		)
		.orderBy(asc(blockRules.position));
	const rules = rows
		.sort(
			(a, b) =>
				a.position - b.position || Number(Boolean(b.campaignId)) - Number(Boolean(a.campaignId))
		)
		.map(({ campaignId: _campaignId, position: _position, ...rule }) => rule as EvaluatedRule);
	const ruleDecision = evaluateRules(rules, visitor);
	const automaticBotBlock =
		campaign.botProtectionEnabled &&
		visitor.isBot &&
		!(ruleDecision.matched && ruleDecision.action === 'allow');
	const base = {
		visitor,
		matchedRule: ruleDecision.matched
			? {
					id: ruleDecision.rule.id,
					type: ruleDecision.rule.type,
					action: ruleDecision.action,
					value: ruleDecision.rule.value
				}
			: null
	};

	if (automaticBotBlock || (ruleDecision.matched && ruleDecision.action === 'block')) {
		return {
			...base,
			outcome: 'blocked' as const,
			reason: automaticBotBlock ? 'Automatic bot protection' : 'Matched blocking rule',
			destination: null,
			location: null
		};
	}
	if (ruleDecision.matched && ruleDecision.action === 'redirect') {
		return {
			...base,
			outcome: 'rule_redirect' as const,
			reason: 'Matched redirect rule',
			destination: null,
			location: safeExternalUrl(ruleDecision.rule.redirectUrl)
		};
	}

	const active = campaign.destinations.filter((destination) => {
		if (!destination.enabled) return false;
		if (destination.activeFrom && destination.activeFrom > now) return false;
		if (destination.activeUntil && destination.activeUntil < now) return false;
		const countries = destination.geoTargets.map((target) => target.countryCode.toUpperCase());
		if (destination.geoMode === 'all') return true;
		if (!visitor.countryCode) return destination.geoMode === 'exclude';
		return destination.geoMode === 'include'
			? countries.includes(visitor.countryCode)
			: !countries.includes(visitor.countryCode);
	});
	const inSchedule =
		(!campaign.startsAt || campaign.startsAt <= now) &&
		(!campaign.endsAt || campaign.endsAt >= now);
	const selected = inSchedule
		? selectDestination(
				active,
				campaign.rotationStrategy,
				`${visitor.ip ?? 'unknown'}|${visitor.userAgent}|${visitor.language ?? ''}`
			)
		: null;
	const attribution = {
		enabled: campaign.attributionEnabled,
		source: campaign.attributionSource,
		medium: campaign.attributionMedium,
		campaign: campaign.attributionCampaign
	};

	if (!selected) {
		return {
			...base,
			outcome: campaign.fallbackUrl ? ('fallback' as const) : ('unavailable' as const),
			reason: inSchedule ? 'No destination matches this visitor' : 'Campaign is outside schedule',
			destination: null,
			location: withAttributionParams(campaign.fallbackUrl ?? '', {}, attribution)
		};
	}
	const rawLocation =
		campaign.redirectType === 'deeplink'
			? safeExternalUrl(selected.deepLink?.universalLink) ||
				safeExternalUrl(selected.deepLink?.webFallbackUrl) ||
				selected.url
			: selected.url;
	return {
		...base,
		outcome: 'destination' as const,
		reason: `Selected by ${campaign.rotationStrategy} rotation`,
		destination: { id: selected.id, name: selected.name, platform: selected.platform },
		location: withAttributionParams(rawLocation, {}, attribution)
	};
}
