import { randomBytes } from 'node:crypto';
import { BETTER_AUTH_SECRET } from '$env/static/private';
import { and, eq, sql } from 'drizzle-orm';
import { db } from './db';
import { campaignEmbedSettings, campaigns, embedEvents } from './db/schema';
import {
	buildEmbedScript,
	createEmbedTokenWithSecret,
	embedSourceDomain,
	isEmbedDomainAllowed,
	normalizeEmbedDomain,
	parseEmbedSettingsFormData,
	verifyEmbedTokenWithSecret,
	type EmbedSettingsInput
} from './embed-core';
import { campaignAccess } from './team';

export {
	buildEmbedScript,
	embedSourceDomain,
	isEmbedDomainAllowed,
	normalizeEmbedDomain,
	parseEmbedSettingsFormData
};
export type { EmbedSettingsInput };

function publicKey(): string {
	return randomBytes(24).toString('base64url');
}

export async function getEmbedEditor(ownerId: string, campaignId: string) {
	const campaign = await db.query.campaigns.findFirst({
		where: and(eq(campaigns.id, campaignId), campaignAccess(ownerId, true)),
		with: { embedSetting: true }
	});
	if (!campaign) return null;

	let setting = campaign.embedSetting;
	if (!setting) {
		const [inserted] = await db
			.insert(campaignEmbedSettings)
			.values({ campaignId, publicKey: publicKey() })
			.onConflictDoNothing({ target: campaignEmbedSettings.campaignId })
			.returning();
		setting =
			inserted ??
			(await db.query.campaignEmbedSettings.findFirst({
				where: eq(campaignEmbedSettings.campaignId, campaignId)
			}));
	}
	if (!setting) throw new Error('Unable to initialize embed settings');
	const [totals] = await db
		.select({
			impressions: sql<number>`count(*) filter (where ${embedEvents.type} = 'impression')::int`,
			clicks: sql<number>`count(*) filter (where ${embedEvents.type} = 'click')::int`
		})
		.from(embedEvents)
		.where(eq(embedEvents.embedSettingId, setting.id));

	return { campaign, setting, totals: totals ?? { impressions: 0, clicks: 0 } };
}

export async function saveEmbedSettings(
	ownerId: string,
	campaignId: string,
	input: EmbedSettingsInput
): Promise<boolean> {
	const updated = await db
		.update(campaignEmbedSettings)
		.set({ ...input, updatedAt: new Date() })
		.from(campaigns)
		.where(
			and(
				eq(campaignEmbedSettings.campaignId, campaignId),
				eq(campaigns.id, campaignEmbedSettings.campaignId),
				campaignAccess(ownerId, true)
			)
		)
		.returning({ id: campaignEmbedSettings.id });
	return updated.length > 0;
}

export async function rotateEmbedPublicKey(ownerId: string, campaignId: string): Promise<boolean> {
	const updated = await db
		.update(campaignEmbedSettings)
		.set({ publicKey: publicKey(), updatedAt: new Date() })
		.from(campaigns)
		.where(
			and(
				eq(campaignEmbedSettings.campaignId, campaignId),
				eq(campaigns.id, campaignEmbedSettings.campaignId),
				campaignAccess(ownerId, true)
			)
		)
		.returning({ id: campaignEmbedSettings.id });
	return updated.length > 0;
}

export async function getPublicEmbed(publicKeyValue: string) {
	const [row] = await db
		.select({
			id: campaignEmbedSettings.id,
			publicKey: campaignEmbedSettings.publicKey,
			enabled: campaignEmbedSettings.enabled,
			rewriteLinks: campaignEmbedSettings.rewriteLinks,
			selector: campaignEmbedSettings.selector,
			forwardPageQuery: campaignEmbedSettings.forwardPageQuery,
			allowedDomains: campaignEmbedSettings.allowedDomains,
			campaignId: campaigns.id,
			campaignSlug: campaigns.slug,
			campaignStatus: campaigns.status,
			ownerId: campaigns.ownerId
		})
		.from(campaignEmbedSettings)
		.innerJoin(campaigns, eq(campaigns.id, campaignEmbedSettings.campaignId))
		.where(eq(campaignEmbedSettings.publicKey, publicKeyValue))
		.limit(1);
	return row ?? null;
}

function signingSecret(): string {
	if (!BETTER_AUTH_SECRET) throw new Error('BETTER_AUTH_SECRET is not set');
	return BETTER_AUTH_SECRET;
}

export function createEmbedToken(key: string, domain: string, now = new Date()): string {
	return createEmbedTokenWithSecret(key, domain, signingSecret(), now);
}

export function verifyEmbedToken(
	token: string,
	key: string,
	now = new Date()
): { domain: string } | null {
	return verifyEmbedTokenWithSecret(token, key, signingSecret(), now);
}

export async function recordEmbedEvent(input: {
	setting: NonNullable<Awaited<ReturnType<typeof getPublicEmbed>>>;
	type: 'impression' | 'click';
	domain: string;
	pageUrl?: string | null;
	userAgent?: string | null;
}) {
	await db.insert(embedEvents).values({
		ownerId: input.setting.ownerId,
		campaignId: input.setting.campaignId,
		embedSettingId: input.setting.id,
		type: input.type,
		sourceDomain: input.domain.slice(0, 255),
		pageUrl: input.pageUrl?.slice(0, 2048) || null,
		userAgent: input.userAgent?.slice(0, 2048) || null
	});
}
