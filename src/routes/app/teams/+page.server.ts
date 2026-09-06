import { fail, redirect } from '@sveltejs/kit';
import { definePageMetaTags } from 'svelte-meta-tags';
import type { Actions, PageServerLoad } from './$types';
import { writeAuditLog } from '$lib/server/audit';
import { createTeam, listUserTeams } from '$lib/server/team';

export const load: PageServerLoad = async ({ locals }) => ({
	...definePageMetaTags({ title: 'Teams', robots: 'noindex, nofollow' }),
	user: locals.user,
	setting: locals.setting,
	teams: locals.user ? await listUserTeams(locals.user.id) : []
});

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		const name = String((await request.formData()).get('name') ?? '').trim();
		if (name.length < 2 || name.length > 120)
			return fail(400, { error: 'Team name must be 2-120 characters' });
		const team = await createTeam(locals.user.id, name);
		await writeAuditLog({
			actorId: locals.user.id,
			action: 'team.created',
			targetType: 'team',
			targetId: team.id,
			meta: { name }
		});
		redirect(303, `/app/teams/${team.id}`);
	}
};
