import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteCampaign, getCampaign, setCampaignStatus } from '$lib/server/campaign';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) redirect(303, '/signin');
	const campaign = await getCampaign(locals.user.id, params.id);
	if (!campaign) error(404, 'Campaign not found');

	return {
		user: locals.user,
		session: locals.session,
		setting: locals.setting,
		publicUrl: `${url.origin.replace(/\/$/, '')}/r/${campaign.slug}`,
		campaign,
		created: url.searchParams.get('created') === '1',
		updated: url.searchParams.get('updated') === '1'
	};
};

export const actions: Actions = {
	delete: async ({ locals, params }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		const deleted = await deleteCampaign(locals.user.id, params.id);
		if (!deleted) return fail(404, { error: 'Campaign not found' });
		redirect(303, '/app/links?deleted=1');
	},
	toggleStatus: async ({ locals, params, request }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		const status = String((await request.formData()).get('status') ?? '');
		if (!['active', 'paused'].includes(status)) return fail(400, { error: 'Invalid status' });

		const updated = await setCampaignStatus(
			locals.user.id,
			params.id,
			status as 'active' | 'paused'
		);
		if (!updated) {
			return fail(400, { error: 'Campaign not found or has no enabled destination' });
		}
		return { success: true };
	}
};
