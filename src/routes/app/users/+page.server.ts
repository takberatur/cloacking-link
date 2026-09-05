import { definePageMetaTags } from 'svelte-meta-tags';
import type { PageServerLoad } from './$types';
import { listManagedUsers } from '$lib/server/user';

export const load: PageServerLoad = async ({ locals, url }) => {
	const users = await listManagedUsers({
		query: url.searchParams.get('q') ?? undefined,
		role: url.searchParams.get('role') ?? undefined,
		status: url.searchParams.get('status') ?? undefined,
		page: Number(url.searchParams.get('page') ?? 1),
		pageSize: Number(url.searchParams.get('pageSize') ?? 20)
	});
	return {
		...definePageMetaTags({ title: 'User management', robots: 'noindex, nofollow' }),
		user: locals.user,
		setting: locals.setting,
		users,
		filters: {
			query: url.searchParams.get('q') ?? '',
			role: url.searchParams.get('role') ?? '',
			status: url.searchParams.get('status') ?? ''
		}
	};
};
