import { and, eq } from 'drizzle-orm';
import { db } from './db';
import { campaigns, safelinkPages } from './db/schema';
import {
	DEFAULT_SAFELINK_DOCUMENT,
	parseSafelinkDocument,
	parseSafelinkTheme,
	renderSafelinkDocument
} from './safelink-document';
import { campaignAccess } from './team';

export async function getSafelinkEditor(ownerId: string, campaignId: string) {
	const campaign = await db.query.campaigns.findFirst({
		where: and(eq(campaigns.id, campaignId), campaignAccess(ownerId, true)),
		with: { safelinkPage: true }
	});
	if (!campaign) return null;

	const page = campaign.safelinkPage;
	return {
		campaign,
		page: page
			? { ...page, theme: parseSafelinkTheme(page.theme) }
			: {
					id: null,
					campaignId,
					title: campaign.name,
					status: 'draft' as const,
					document: JSON.parse(DEFAULT_SAFELINK_DOCUMENT) as Record<string, unknown>,
					publishedDocument: null,
					theme: parseSafelinkTheme(null),
					publishedAt: null,
					createdAt: null,
					updatedAt: null
				}
	};
}

export type SafelinkInput = {
	title: string;
	document: Record<string, unknown>;
	theme: ReturnType<typeof parseSafelinkTheme>;
};

function publishedSnapshot(input: SafelinkInput): Record<string, unknown> {
	return {
		...input.document,
		safelink: { title: input.title, theme: input.theme }
	};
}

export function parseSafelinkFormData(formData: FormData): SafelinkInput {
	const title = String(formData.get('title') ?? '').trim();
	if (title.length < 2 || title.length > 200) throw new Error('Title must be 2 to 200 characters');

	return {
		title,
		document: parseSafelinkDocument(String(formData.get('document') ?? '')),
		theme: parseSafelinkTheme({
			ctaLabel: formData.get('ctaLabel'),
			countdownSeconds: formData.get('countdownSeconds'),
			backgroundColor: formData.get('backgroundColor'),
			textColor: formData.get('textColor'),
			accentColor: formData.get('accentColor')
		})
	};
}

export async function saveSafelink(
	ownerId: string,
	campaignId: string,
	input: SafelinkInput,
	publish = false
) {
	const [campaign] = await db
		.select({ id: campaigns.id })
		.from(campaigns)
		.where(and(eq(campaigns.id, campaignId), campaignAccess(ownerId, true)))
		.limit(1);
	if (!campaign) return null;

	const now = new Date();
	const existing = await db.query.safelinkPages.findFirst({
		where: eq(safelinkPages.campaignId, campaignId)
	});
	const values = {
		title: input.title,
		document: input.document,
		theme: input.theme,
		status: publish ? ('published' as const) : (existing?.status ?? ('draft' as const)),
		...(publish ? { publishedDocument: publishedSnapshot(input), publishedAt: now } : {}),
		updatedAt: now
	};

	if (existing) {
		await db.update(safelinkPages).set(values).where(eq(safelinkPages.id, existing.id));
	} else {
		await db.insert(safelinkPages).values({
			campaignId,
			...values,
			...(publish ? {} : { status: 'draft' as const })
		});
	}
	return { published: publish };
}

export async function unpublishSafelink(ownerId: string, campaignId: string) {
	const [campaign] = await db
		.select({ id: campaigns.id })
		.from(campaigns)
		.where(and(eq(campaigns.id, campaignId), campaignAccess(ownerId, true)))
		.limit(1);
	if (!campaign) return false;

	const updated = await db
		.update(safelinkPages)
		.set({ status: 'draft', updatedAt: new Date() })
		.where(eq(safelinkPages.campaignId, campaignId))
		.returning({ id: safelinkPages.id });
	return updated.length > 0;
}

export function safelinkViewModel(
	page: {
		title: string;
		document: Record<string, unknown>;
		publishedDocument?: Record<string, unknown> | null;
		theme: Record<string, unknown> | null;
	},
	preview = false
) {
	const document = preview ? page.document : page.publishedDocument;
	const metadata =
		!preview && document && typeof document.safelink === 'object' && document.safelink !== null
			? (document.safelink as Record<string, unknown>)
			: null;
	return {
		title: typeof metadata?.title === 'string' ? metadata.title : page.title,
		html: renderSafelinkDocument(document),
		theme: parseSafelinkTheme(
			metadata?.theme && typeof metadata.theme === 'object'
				? (metadata.theme as Record<string, unknown>)
				: page.theme
		)
	};
}
