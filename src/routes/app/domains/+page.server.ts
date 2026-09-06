import { fail } from '@sveltejs/kit';
import { definePageMetaTags } from 'svelte-meta-tags';
import type { Actions, PageServerLoad } from './$types';
import {
	createCampaignDomain,
	deleteCampaignDomain,
	domainDnsInstructions,
	listCampaignDomains,
	listDomainEligibleCampaigns,
	verifyCampaignDomain
} from '$lib/server/custom-domain';
import { writeAuditLog } from '$lib/server/audit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return { domains: [], campaigns: [] };
	const [domains, campaigns] = await Promise.all([
		listCampaignDomains(locals.user.id),
		listDomainEligibleCampaigns(locals.user.id)
	]);
	return {
		...definePageMetaTags({ title: 'Custom domains', robots: 'noindex, nofollow' }),
		user: locals.user,
		setting: locals.setting,
		campaigns,
		domains: domains.map((domain) => ({ ...domain, dns: domainDnsInstructions(domain) }))
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		const data = await request.formData();
		const campaignId = String(data.get('campaignId') ?? '');
		const hostname = String(data.get('hostname') ?? '');
		const result = await createCampaignDomain(locals.user.id, campaignId, hostname);
		if (!result.ok) {
			const messages = {
				invalid: 'Enter a valid public hostname without protocol or path',
				campaign: 'Campaign not found or you cannot manage it',
				exists: 'This hostname is already registered'
			};
			return fail(400, { error: messages[result.reason] });
		}
		await writeAuditLog({
			actorId: locals.user.id,
			action: 'domain.created',
			targetType: 'campaign_domain',
			targetId: result.domain.id,
			meta: { hostname: result.domain.hostname, campaignId }
		});
		return { success: true, message: 'Domain added. Create the TXT record, then verify it.' };
	},
	verify: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		const id = String((await request.formData()).get('id') ?? '');
		const result = await verifyCampaignDomain(locals.user.id, id);
		if (!result.ok) {
			return fail(result.reason === 'not_found' ? 404 : 400, {
				error:
					result.reason === 'not_found'
						? 'Domain not found'
						: 'TXT verification record was not found yet'
			});
		}
		await writeAuditLog({
			actorId: locals.user.id,
			action: 'domain.verified',
			targetType: 'campaign_domain',
			targetId: id
		});
		return { success: true, message: 'Domain ownership verified.' };
	},
	delete: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		const id = String((await request.formData()).get('id') ?? '');
		if (!(await deleteCampaignDomain(locals.user.id, id))) {
			return fail(404, { error: 'Domain not found' });
		}
		await writeAuditLog({
			actorId: locals.user.id,
			action: 'domain.deleted',
			targetType: 'campaign_domain',
			targetId: id
		});
		return { success: true, message: 'Domain removed.' };
	}
};
