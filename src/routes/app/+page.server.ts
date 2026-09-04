import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { definePageMetaTags } from 'svelte-meta-tags';
import { getDashboardAnalytics, parseAnalyticsRange } from '$lib/server/analytics';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, session, setting } = locals;
	if (!user) redirect(303, '/signin');
	const range = parseAnalyticsRange(url.searchParams);
	const pageMetaTags = definePageMetaTags({
		title: 'Dashboard',
		robots: 'noindex, nofollow'
	});

	return {
		...pageMetaTags,
		user,
		session,
		setting,
		analytics: await getDashboardAnalytics(user.id, range)
	};
};
