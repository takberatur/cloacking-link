import { randomBytes } from 'node:crypto';
import { resolveTxt } from 'node:dns/promises';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { campaignDomains, campaigns } from '$lib/server/db/schema';
import { campaignAccess } from '$lib/server/team';

const domainCache = new Map<string, { expiresAt: number; slug: string | null }>();
const DOMAIN_CACHE_MS = 60_000;

export function normalizeHostname(input: string): string | null {
	const raw = input.trim().toLowerCase().replace(/\.$/, '');
	if (!raw || raw.includes('/') || raw.includes('@') || raw.includes(':') || raw.includes('*')) {
		return null;
	}
	try {
		const hostname = new URL(`http://${raw}`).hostname.replace(/\.$/, '');
		if (
			hostname.length > 253 ||
			!hostname.includes('.') ||
			/^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
			!hostname.split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
		) {
			return null;
		}
		return hostname;
	} catch {
		return null;
	}
}

function platformHostnames() {
	const values = [
		process.env.ORIGIN,
		process.env.BETTER_AUTH_URL,
		...(process.env.PRIMARY_HOSTNAMES ?? '').split(',')
	];
	return new Set(
		values.flatMap((value) => {
			if (!value?.trim()) return [];
			try {
				return [new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase()];
			} catch {
				return [];
			}
		})
	);
}

export function isPlatformHostname(hostname: string) {
	const normalized = hostname.toLowerCase();
	return (
		normalized === 'localhost' ||
		normalized === '127.0.0.1' ||
		normalized === '::1' ||
		platformHostnames().has(normalized)
	);
}

function verificationName(hostname: string) {
	return `_linkshift-verification.${hostname}`;
}

function verificationValue(token: string) {
	return `linkshift-verification=${token}`;
}

export async function listCampaignDomains(userId: string) {
	return db
		.select({
			id: campaignDomains.id,
			campaignId: campaignDomains.campaignId,
			campaignName: campaigns.name,
			hostname: campaignDomains.hostname,
			status: campaignDomains.status,
			verificationToken: campaignDomains.verificationToken,
			verifiedAt: campaignDomains.verifiedAt,
			lastCheckedAt: campaignDomains.lastCheckedAt,
			createdAt: campaignDomains.createdAt,
			canManage: campaignAccess(userId, true)
		})
		.from(campaignDomains)
		.innerJoin(campaigns, eq(campaignDomains.campaignId, campaigns.id))
		.where(campaignAccess(userId))
		.orderBy(desc(campaignDomains.createdAt));
}

export async function listDomainEligibleCampaigns(userId: string) {
	return db
		.select({ id: campaigns.id, name: campaigns.name, slug: campaigns.slug })
		.from(campaigns)
		.where(campaignAccess(userId, true))
		.orderBy(desc(campaigns.updatedAt));
}

export async function createCampaignDomain(userId: string, campaignId: string, input: string) {
	const hostname = normalizeHostname(input);
	if (!hostname || isPlatformHostname(hostname))
		return { ok: false as const, reason: 'invalid' as const };
	const campaign = await db
		.select({ id: campaigns.id, ownerId: campaigns.ownerId })
		.from(campaigns)
		.where(and(eq(campaigns.id, campaignId), campaignAccess(userId, true)))
		.limit(1);
	if (!campaign[0]) return { ok: false as const, reason: 'campaign' as const };

	try {
		const [domain] = await db
			.insert(campaignDomains)
			.values({
				ownerId: campaign[0].ownerId,
				campaignId,
				hostname,
				verificationToken: randomBytes(24).toString('hex')
			})
			.returning();
		domainCache.delete(hostname);
		return { ok: true as const, domain };
	} catch (error) {
		if ((error as { cause?: { code?: string }; code?: string }).cause?.code === '23505') {
			return { ok: false as const, reason: 'exists' as const };
		}
		throw error;
	}
}

async function managedDomain(userId: string, id: string) {
	const [domain] = await db
		.select({
			id: campaignDomains.id,
			hostname: campaignDomains.hostname,
			verificationToken: campaignDomains.verificationToken
		})
		.from(campaignDomains)
		.innerJoin(campaigns, eq(campaignDomains.campaignId, campaigns.id))
		.where(and(eq(campaignDomains.id, id), campaignAccess(userId, true)))
		.limit(1);
	return domain ?? null;
}

export async function verifyCampaignDomain(userId: string, id: string) {
	const domain = await managedDomain(userId, id);
	if (!domain) return { ok: false as const, reason: 'not_found' as const };
	let records: string[][] = [];
	try {
		records = await resolveTxt(verificationName(domain.hostname));
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (!['ENODATA', 'ENOTFOUND', 'ESERVFAIL', 'ETIMEOUT'].includes(code ?? '')) throw error;
	}
	const verified = records.some(
		(parts) => parts.join('') === verificationValue(domain.verificationToken)
	);
	const now = new Date();
	await db
		.update(campaignDomains)
		.set({
			status: verified ? 'verified' : 'pending',
			verifiedAt: verified ? now : null,
			lastCheckedAt: now,
			updatedAt: now
		})
		.where(eq(campaignDomains.id, domain.id));
	domainCache.delete(domain.hostname);
	return { ok: verified as boolean, reason: verified ? null : ('dns_record_missing' as const) };
}

export async function deleteCampaignDomain(userId: string, id: string) {
	const domain = await managedDomain(userId, id);
	if (!domain) return false;
	await db.delete(campaignDomains).where(eq(campaignDomains.id, domain.id));
	domainCache.delete(domain.hostname);
	return true;
}

export async function resolveCustomDomain(hostname: string): Promise<string | null> {
	const normalized = normalizeHostname(hostname);
	if (!normalized || isPlatformHostname(normalized)) return null;
	const cached = domainCache.get(normalized);
	if (cached && cached.expiresAt > Date.now()) return cached.slug;

	const [row] = await db
		.select({ slug: campaigns.slug })
		.from(campaignDomains)
		.innerJoin(campaigns, eq(campaignDomains.campaignId, campaigns.id))
		.where(
			and(
				eq(campaignDomains.hostname, normalized),
				eq(campaignDomains.status, 'verified'),
				eq(campaigns.status, 'active')
			)
		)
		.limit(1);
	const slug = row?.slug ?? null;
	domainCache.set(normalized, { expiresAt: Date.now() + DOMAIN_CACHE_MS, slug });
	return slug;
}

export function domainDnsInstructions(domain: { hostname: string; verificationToken: string }) {
	let routingTarget = process.env.CUSTOM_DOMAIN_CNAME_TARGET?.trim() ?? '';
	if (!routingTarget && process.env.ORIGIN) {
		try {
			routingTarget = new URL(process.env.ORIGIN).hostname;
		} catch {
			// The settings screen will leave routing target unavailable until it is configured.
		}
	}
	return {
		type: 'TXT',
		name: verificationName(domain.hostname),
		value: verificationValue(domain.verificationToken),
		routingType: 'CNAME',
		routingName: domain.hostname,
		routingTarget: routingTarget || null
	};
}
