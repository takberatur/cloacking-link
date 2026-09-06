import { definePageMetaTags } from 'svelte-meta-tags';
import type { PageServerLoad } from './$types';
import { listAuditLogs } from '$lib/server/audit';

export const load: PageServerLoad = async ({ locals, url }) => {
	const logs = await listAuditLogs({
		query: url.searchParams.get('q') ?? undefined,
		action: url.searchParams.get('action') ?? undefined,
		page: Number(url.searchParams.get('page') ?? 1),
		pageSize: Number(url.searchParams.get('pageSize') ?? 20)
	});
	return {
		...definePageMetaTags({ title: 'Audit log', robots: 'noindex, nofollow' }),
		user: locals.user,
		setting: locals.setting,
		logs,
		query: url.searchParams.get('q') ?? ''
	};
};
