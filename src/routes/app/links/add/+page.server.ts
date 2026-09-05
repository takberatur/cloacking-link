import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	campaignValidationErrors,
	createCampaign,
	parseCampaignFormData
} from '$lib/server/campaign';
import { writeAuditLog } from '$lib/server/audit';
import { listWritableTeams } from '$lib/server/team';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/signin');
	return {
		user: locals.user,
		session: locals.session,
		setting: locals.setting,
		teams: await listWritableTeams(locals.user.id)
	};
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
			if ((error as Error).message === 'TEAM_ACCESS_DENIED')
				return fail(403, { error: 'You cannot assign campaigns to that team' });
			if ((error as { code?: string }).code === '23505') {
				return fail(409, { error: 'That campaign slug is already in use' });
			}
			console.error('Unable to create campaign', error);
			return fail(500, { error: 'Unable to create campaign right now' });
		}
		await writeAuditLog({
			actorId: locals.user.id,
			action: 'campaign.created',
			targetType: 'campaign',
			targetId: campaign.id,
			meta: { teamId: parsed.data.teamId || null }
		});

		redirect(303, `/app/links/${campaign.id}?created=1`);
	}
};
