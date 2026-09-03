import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteCampaign, listCampaigns, setCampaignStatus } from '$lib/server/campaign';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, '/signin');

	const filters = {
		query: url.searchParams.get('q') ?? '',
		status: url.searchParams.get('status') ?? '',
		from: url.searchParams.get('from') ?? '',
		to: url.searchParams.get('to') ?? '',
		page: Number(url.searchParams.get('page') ?? 1),
		pageSize: Number(url.searchParams.get('pageSize') ?? 10)
	};

	return {
		user: locals.user,
		session: locals.session,
		setting: locals.setting,
		filters,
		campaigns: await listCampaigns(locals.user.id, filters)
	};
};

export const actions: Actions = {
	delete: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		const campaignId = String((await request.formData()).get('campaignId') ?? '');
		if (!campaignId) return fail(400, { error: 'Campaign ID is required' });

		const deleted = await deleteCampaign(locals.user.id, campaignId);
		if (!deleted) return fail(404, { error: 'Campaign not found' });
		return { success: true, message: 'Campaign deleted' };
	},
	toggleStatus: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		const formData = await request.formData();
		const campaignId = String(formData.get('campaignId') ?? '');
		const status = String(formData.get('status') ?? '');
		if (!campaignId || !['active', 'paused'].includes(status)) {
			return fail(400, { error: 'Invalid campaign status request' });
		}

		const updated = await setCampaignStatus(
			locals.user.id,
			campaignId,
			status as 'active' | 'paused'
		);
		if (!updated) return fail(404, { error: 'Campaign not found' });
		return { success: true, message: `Campaign ${status}` };
	}
};
