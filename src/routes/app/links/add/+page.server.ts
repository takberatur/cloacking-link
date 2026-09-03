import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	campaignValidationErrors,
	createCampaign,
	parseCampaignFormData
} from '$lib/server/campaign';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/signin');
	return { user: locals.user, session: locals.session, setting: locals.setting };
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		const parsed = parseCampaignFormData(await request.formData());
		if (!parsed.success) {
			return fail(400, {
				error: 'Please review the campaign fields',
				validation: campaignValidationErrors(parsed.error)
			});
		}

		let campaign: Awaited<ReturnType<typeof createCampaign>>;
		try {
			campaign = await createCampaign(locals.user.id, parsed.data);
		} catch (error) {
			if ((error as { code?: string }).code === '23505') {
				return fail(409, { error: 'That campaign slug is already in use' });
			}
			console.error('Unable to create campaign', error);
			return fail(500, { error: 'Unable to create campaign right now' });
		}

		redirect(303, `/app/links/${campaign.id}?created=1`);
	}
};
