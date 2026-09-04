import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { db } from './db';
import { campaigns, destinationGeoTargets, destinations } from './db/schema';
import { campaignSchema, type CampaignInput } from '$lib/utils/validators';
import { generateSlug } from '$lib/utils/slug';

const PAGE_SIZE_OPTIONS = new Set([10, 20, 50]);

export type CampaignListFilters = {
	query?: string;
	status?: string;
	from?: string;
	to?: string;
	page?: number;
	pageSize?: number;
};

function stringValue(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === 'string' ? value : '';
}

function booleanValue(formData: FormData, key: string): boolean {
	return formData.get(key) === 'on' || formData.get(key) === 'true';
}

export function parseCampaignFormData(formData: FormData) {
	const names = formData.getAll('destinationName');
	const urls = formData.getAll('destinationUrl');
	const ids = formData.getAll('destinationId');
	const types = formData.getAll('destinationType');
	const platforms = formData.getAll('destinationPlatform');
	const weights = formData.getAll('destinationWeight');
	const priorities = formData.getAll('destinationPriority');
	const geoModes = formData.getAll('destinationGeoMode');
	const countries = formData.getAll('destinationCountries');
	const enabledIndexes = new Set(formData.getAll('destinationEnabled').map(String));

	return campaignSchema.safeParse({
		name: stringValue(formData, 'name'),
		slug: stringValue(formData, 'slug'),
		description: stringValue(formData, 'description'),
		status: stringValue(formData, 'status'),
		redirectType: stringValue(formData, 'redirectType'),
		rotationStrategy: stringValue(formData, 'rotationStrategy'),
		fallbackUrl: stringValue(formData, 'fallbackUrl'),
		botProtectionEnabled: booleanValue(formData, 'botProtectionEnabled'),
		trackingEnabled: booleanValue(formData, 'trackingEnabled'),
		preserveQueryParams: booleanValue(formData, 'preserveQueryParams'),
		stripReferrer: booleanValue(formData, 'stripReferrer'),
		destinations: names.map((name, index) => ({
			id: String(ids[index] ?? '') || undefined,
			name: String(name),
			url: String(urls[index] ?? ''),
			type: String(types[index] ?? 'affiliate'),
			platform: String(platforms[index] ?? 'generic'),
			enabled: enabledIndexes.has(String(index)),
			weight: String(weights[index] ?? '100'),
			priority: String(priorities[index] ?? '0'),
			geoMode: String(geoModes[index] ?? 'all'),
			countries: [
				...new Set(
					String(countries[index] ?? '')
						.split(',')
						.map((country) => country.trim().toUpperCase())
						.filter(Boolean)
				)
			]
		}))
	});
}

export function campaignValidationErrors(error: { flatten: () => unknown }) {
	return error.flatten();
}

export async function listCampaigns(ownerId: string, filters: CampaignListFilters) {
	const page = Math.max(1, Number(filters.page) || 1);
	const requestedPageSize = Number(filters.pageSize) || 10;
	const pageSize = PAGE_SIZE_OPTIONS.has(requestedPageSize) ? requestedPageSize : 10;
	const conditions = [eq(campaigns.ownerId, ownerId)];
	const query = filters.query?.trim();

	if (query) {
		conditions.push(or(ilike(campaigns.name, `%${query}%`), ilike(campaigns.slug, `%${query}%`))!);
	}
	if (filters.status && ['draft', 'active', 'paused', 'archived'].includes(filters.status)) {
		conditions.push(
			eq(campaigns.status, filters.status as (typeof campaigns.status.enumValues)[number])
		);
	}
	if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) {
		const fromDate = new Date(`${filters.from}T00:00:00.000Z`);
		if (!Number.isNaN(fromDate.getTime())) conditions.push(gte(campaigns.createdAt, fromDate));
	}
	if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) {
		const toDate = new Date(`${filters.to}T23:59:59.999Z`);
		if (!Number.isNaN(toDate.getTime())) conditions.push(lte(campaigns.createdAt, toDate));
	}

	const where = and(...conditions);
	const [{ total }] = await db.select({ total: count() }).from(campaigns).where(where);
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const currentPage = Math.min(page, totalPages);

	const items = await db
		.select({
			id: campaigns.id,
			name: campaigns.name,
			slug: campaigns.slug,
			status: campaigns.status,
			redirectType: campaigns.redirectType,
			rotationStrategy: campaigns.rotationStrategy,
			trackingEnabled: campaigns.trackingEnabled,
			botProtectionEnabled: campaigns.botProtectionEnabled,
			createdAt: campaigns.createdAt,
			updatedAt: campaigns.updatedAt,
			destinationCount: sql<number>`count(${destinations.id})::int`
		})
		.from(campaigns)
		.leftJoin(destinations, eq(destinations.campaignId, campaigns.id))
		.where(where)
		.groupBy(campaigns.id)
		.orderBy(desc(campaigns.updatedAt))
		.limit(pageSize)
		.offset((currentPage - 1) * pageSize);

	return { items, total, page: currentPage, pageSize, totalPages };
}

export async function getCampaign(ownerId: string, campaignId: string) {
	return db.query.campaigns.findFirst({
		where: and(eq(campaigns.id, campaignId), eq(campaigns.ownerId, ownerId)),
		with: {
			destinations: {
				orderBy: [asc(destinations.position)],
				with: { geoTargets: true, deepLink: true }
			},
			blockRules: { orderBy: (rule, { asc }) => [asc(rule.position)] },
			safelinkPage: true,
			popunderSetting: true
		}
	});
}

async function availableSlug(requestedSlug: string): Promise<string> {
	if (requestedSlug) return requestedSlug;

	for (let attempt = 0; attempt < 8; attempt += 1) {
		const slug = generateSlug();
		const existing = await db
			.select({ id: campaigns.id })
			.from(campaigns)
			.where(eq(campaigns.slug, slug))
			.limit(1);
		if (existing.length === 0) return slug;
	}

	throw new Error('Unable to generate an available campaign slug');
}

function campaignValues(ownerId: string, input: CampaignInput, slug: string) {
	return {
		ownerId,
		name: input.name,
		slug,
		description: input.description || null,
		status: input.status,
		redirectType: input.redirectType,
		rotationStrategy: input.rotationStrategy,
		fallbackUrl: input.fallbackUrl || null,
		botProtectionEnabled: input.botProtectionEnabled,
		trackingEnabled: input.trackingEnabled,
		preserveQueryParams: input.preserveQueryParams,
		stripReferrer: input.stripReferrer,
		updatedAt: new Date()
	};
}

export async function createCampaign(ownerId: string, input: CampaignInput) {
	const campaignId = crypto.randomUUID();
	const slug = await availableSlug(input.slug);
	const destinationRows = input.destinations.map((destination, position) => ({
		id: crypto.randomUUID(),
		campaignId,
		name: destination.name,
		url: destination.url,
		type: destination.type,
		platform: destination.platform,
		enabled: destination.enabled,
		weight: destination.weight,
		priority: destination.priority,
		position,
		geoMode: destination.geoMode
	}));
	const geoRows = destinationRows.flatMap((destination, index) =>
		input.destinations[index].geoMode === 'all'
			? []
			: input.destinations[index].countries.map((countryCode) => ({
					destinationId: destination.id,
					countryCode
				}))
	);

	const statements: BatchItem<'pg'>[] = [
		db.insert(campaigns).values({
			id: campaignId,
			...campaignValues(ownerId, input, slug)
		}),
		db.insert(destinations).values(destinationRows)
	];
	if (geoRows.length > 0) statements.push(db.insert(destinationGeoTargets).values(geoRows));

	await db.batch(statements as [BatchItem<'pg'>, ...BatchItem<'pg'>[]]);
	return { id: campaignId, slug };
}

export async function updateCampaign(ownerId: string, campaignId: string, input: CampaignInput) {
	const existing = await getCampaign(ownerId, campaignId);
	if (!existing) return null;

	const slug = input.slug || existing.slug;
	const currentIds = new Set(existing.destinations.map((destination) => destination.id));
	const incomingIds = new Set(input.destinations.flatMap((destination) => destination.id ?? []));
	const removedIds = [...currentIds].filter((id) => !incomingIds.has(id));
	const statements: BatchItem<'pg'>[] = [
		db
			.update(campaigns)
			.set(campaignValues(ownerId, input, slug))
			.where(and(eq(campaigns.id, campaignId), eq(campaigns.ownerId, ownerId))),
		db
			.update(destinations)
			.set({ position: sql`${destinations.position} + 1000` })
			.where(eq(destinations.campaignId, campaignId))
	];

	if (removedIds.length > 0) {
		statements.push(db.delete(destinations).where(inArray(destinations.id, removedIds)));
	}

	input.destinations.forEach((destination, position) => {
		const destinationId =
			destination.id && currentIds.has(destination.id) ? destination.id : crypto.randomUUID();
		const values = {
			campaignId,
			name: destination.name,
			url: destination.url,
			type: destination.type,
			platform: destination.platform,
			enabled: destination.enabled,
			weight: destination.weight,
			priority: destination.priority,
			position,
			geoMode: destination.geoMode,
			updatedAt: new Date()
		};

		if (destination.id && currentIds.has(destination.id)) {
			statements.push(
				db
					.update(destinations)
					.set(values)
					.where(and(eq(destinations.id, destinationId), eq(destinations.campaignId, campaignId)))
			);
			statements.push(
				db
					.delete(destinationGeoTargets)
					.where(eq(destinationGeoTargets.destinationId, destinationId))
			);
		} else {
			statements.push(db.insert(destinations).values({ id: destinationId, ...values }));
		}

		if (destination.geoMode !== 'all' && destination.countries.length > 0) {
			statements.push(
				db
					.insert(destinationGeoTargets)
					.values(destination.countries.map((countryCode) => ({ destinationId, countryCode })))
			);
		}
	});

	await db.batch(statements as [BatchItem<'pg'>, ...BatchItem<'pg'>[]]);
	return { id: campaignId, slug };
}

export async function deleteCampaign(ownerId: string, campaignId: string) {
	const deleted = await db
		.delete(campaigns)
		.where(and(eq(campaigns.id, campaignId), eq(campaigns.ownerId, ownerId)))
		.returning({ id: campaigns.id });
	return deleted.length > 0;
}

export async function setCampaignStatus(
	ownerId: string,
	campaignId: string,
	status: 'active' | 'paused'
) {
	if (status === 'active') {
		const eligibleDestination = await db
			.select({ id: destinations.id })
			.from(destinations)
			.innerJoin(campaigns, eq(campaigns.id, destinations.campaignId))
			.where(
				and(
					eq(campaigns.id, campaignId),
					eq(campaigns.ownerId, ownerId),
					eq(destinations.enabled, true)
				)
			)
			.limit(1);
		if (eligibleDestination.length === 0) return false;
	}

	const updated = await db
		.update(campaigns)
		.set({ status, updatedAt: new Date() })
		.where(and(eq(campaigns.id, campaignId), eq(campaigns.ownerId, ownerId)))
		.returning({ id: campaigns.id });
	return updated.length > 0;
}
