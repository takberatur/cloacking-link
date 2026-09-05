import { error, fail, redirect } from '@sveltejs/kit';
import { definePageMetaTags } from 'svelte-meta-tags';
import type { Actions, PageServerLoad } from './$types';
import { writeAuditLog } from '$lib/server/audit';
import {
	assignUserPermissions,
	changeUserRole,
	getManagedUser,
	setUserBan
} from '$lib/server/user';

function canManage(actorRole: string | null | undefined, targetRole: string): boolean {
	if (actorRole === 'superadmin') return true;
	return actorRole === 'moderator' && targetRole === 'user';
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const managedUser = await getManagedUser(params.id);
	if (!managedUser) error(404, 'User not found');
	return {
		...definePageMetaTags({
			title: `${managedUser.account.name} · User`,
			robots: 'noindex, nofollow'
		}),
		user: locals.user,
		setting: locals.setting,
		managedUser
	};
};

export const actions: Actions = {
	role: async ({ locals, params, request }) => {
		if (!locals.user || locals.user.role !== 'superadmin')
			return fail(403, { error: 'Only superadmins can change roles' });
		if (locals.user.id === params.id)
			return fail(400, { error: 'You cannot change your own role' });
		const value = String((await request.formData()).get('role') ?? '');
		if (!['user', 'moderator', 'superadmin'].includes(value))
			return fail(400, { error: 'Invalid role' });
		const result = await changeUserRole(params.id, value as 'user' | 'moderator' | 'superadmin');
		if (!result.ok) {
			return fail(result.reason === 'not_found' ? 404 : 409, {
				error:
					result.reason === 'last_superadmin'
						? 'The last superadmin cannot be demoted'
						: 'User not found'
			});
		}
		await writeAuditLog({
			actorId: locals.user.id,
			action: 'user.role_changed',
			targetType: 'user',
			targetId: params.id,
			meta: { from: result.previousRole, to: value }
		});
		redirect(303, `/app/users/${params.id}?updated=role`);
	},
	ban: async ({ locals, params, request }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		if (
			locals.user.role !== 'superadmin' &&
			!(locals.permissions ?? []).includes('user:write')
		) {
			return fail(403, { error: 'The user:write permission is required' });
		}
		if (locals.user.id === params.id)
			return fail(400, { error: 'You cannot ban your own account' });
		const target = await getManagedUser(params.id);
		if (!target) return fail(404, { error: 'User not found' });
		if (!canManage(locals.user.role, target.account.role))
			return fail(403, { error: 'You cannot manage this user' });
		const formData = await request.formData();
		const banned = formData.get('banned') === 'true';
		const reason = String(formData.get('reason') ?? '').slice(0, 500);
		await setUserBan(params.id, banned, reason);
		await writeAuditLog({
			actorId: locals.user.id,
			action: banned ? 'user.banned' : 'user.unbanned',
			targetType: 'user',
			targetId: params.id,
			meta: banned ? { reason: reason || 'Administrative action' } : {}
		});
		redirect(303, `/app/users/${params.id}?updated=${banned ? 'banned' : 'unbanned'}`);
	},
	permissions: async ({ locals, params, request }) => {
		if (!locals.user || locals.user.role !== 'superadmin')
			return fail(403, { error: 'Only superadmins can assign permissions' });
		const permissionIds = (await request.formData()).getAll('permissionId').map(String);
		const result = await assignUserPermissions(params.id, permissionIds);
		if (!result) return fail(404, { error: 'User not found' });
		await writeAuditLog({
			actorId: locals.user.id,
			action: 'user.permissions_changed',
			targetType: 'user',
			targetId: params.id,
			meta: { assigned: result.assigned }
		});
		redirect(303, `/app/users/${params.id}?updated=permissions`);
	}
};
