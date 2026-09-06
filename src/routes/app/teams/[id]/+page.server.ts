import { error, fail, redirect } from '@sveltejs/kit';
import { definePageMetaTags } from 'svelte-meta-tags';
import type { Actions, PageServerLoad } from './$types';
import { writeAuditLog } from '$lib/server/audit';
import {
	addTeamMember,
	getTeamForMember,
	removeTeamMember,
	updateTeamMember
} from '$lib/server/team';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) error(401, 'Authentication required');
	const result = await getTeamForMember(locals.user.id, params.id);
	if (!result) error(404, 'Team not found');
	return {
		...definePageMetaTags({ title: `${result.team.name} · Team`, robots: 'noindex, nofollow' }),
		user: locals.user,
		setting: locals.setting,
		...result
	};
};

export const actions: Actions = {
	add: async ({ locals, params, request }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '').trim();
		const role = String(formData.get('role') ?? 'member');
		if (!/^\S+@\S+\.\S+$/.test(email) || !['admin', 'member', 'viewer'].includes(role))
			return fail(400, { error: 'Enter a valid member and role' });
		const result = await addTeamMember(
			locals.user.id,
			params.id,
			email,
			role as 'admin' | 'member' | 'viewer'
		);
		if (!result.ok)
			return fail(result.reason === 'forbidden' ? 403 : 404, {
				error:
					result.reason === 'forbidden'
						? 'Only team owners and admins can add members'
						: 'No registered user has that email'
			});
		await writeAuditLog({
			actorId: locals.user.id,
			action: 'team.member_added',
			targetType: 'team',
			targetId: params.id,
			meta: { userId: result.userId, role }
		});
		redirect(303, `/app/teams/${params.id}?updated=member`);
	},
	role: async ({ locals, params, request }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		const formData = await request.formData();
		const memberId = String(formData.get('memberId') ?? '');
		const role = String(formData.get('role') ?? 'member');
		if (!['admin', 'member', 'viewer'].includes(role))
			return fail(400, { error: 'Invalid team role' });
		if (
			!(await updateTeamMember(
				locals.user.id,
				params.id,
				memberId,
				role as 'admin' | 'member' | 'viewer'
			))
		)
			return fail(403, { error: 'Member role could not be changed' });
		await writeAuditLog({
			actorId: locals.user.id,
			action: 'team.member_role_changed',
			targetType: 'team',
			targetId: params.id,
			meta: { memberId, role }
		});
		redirect(303, `/app/teams/${params.id}?updated=role`);
	},
	remove: async ({ locals, params, request }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		const memberId = String((await request.formData()).get('memberId') ?? '');
		if (!(await removeTeamMember(locals.user.id, params.id, memberId)))
			return fail(403, { error: 'Member could not be removed' });
		await writeAuditLog({
			actorId: locals.user.id,
			action: 'team.member_removed',
			targetType: 'team',
			targetId: params.id,
			meta: { memberId }
		});
		redirect(303, `/app/teams/${params.id}?updated=removed`);
	}
};
