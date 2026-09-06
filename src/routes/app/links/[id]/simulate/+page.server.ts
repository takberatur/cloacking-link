import { error, fail, redirect } from '@sveltejs/kit';
import { definePageMetaTags } from 'svelte-meta-tags';
import type { Actions, PageServerLoad } from './$types';
import { getCampaign } from '$lib/server/campaign';
import { simulateCampaignRedirect } from '$lib/server/redirect/simulator';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(303, '/signin');
	const campaign = await getCampaign(locals.user.id, params.id);
	if (!campaign) error(404, 'Campaign not found');
	return {
		...definePageMetaTags({ title: `Test ${campaign.name}`, robots: 'noindex, nofollow' }),
		user: locals.user,
		setting: locals.setting,
		campaign: { id: campaign.id, name: campaign.name, slug: campaign.slug }
	};
};

export const actions: Actions = {
	default: async ({ locals, params, request }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		const data = await request.formData();
		const values = {
			ip: String(data.get('ip') ?? '').trim(),
			countryCode: String(data.get('countryCode') ?? '')
				.trim()
				.toUpperCase(),
			userAgent: String(data.get('userAgent') ?? '').trim(),
			referrer: String(data.get('referrer') ?? '').trim(),
			language: String(data.get('language') ?? '').trim()
		};
		if (values.countryCode && !/^[A-Z]{2}$/.test(values.countryCode)) {
			return fail(400, { error: 'Country must be a two-letter ISO code', values });
		}
		if (values.userAgent.length > 2048 || values.referrer.length > 2048) {
			return fail(400, { error: 'User agent or referrer is too long', values });
		}
		const result = await simulateCampaignRedirect(locals.user.id, params.id, values);
		if (!result) return fail(404, { error: 'Campaign not found', values });
		return { result, values };
	}
};
