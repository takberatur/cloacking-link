import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getSafelinkEditor,
	parseSafelinkFormData,
	saveSafelink,
	unpublishSafelink
} from '$lib/server/safelink';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) redirect(303, '/signin');
	const editor = await getSafelinkEditor(locals.user.id, params.id);
	if (!editor) error(404, 'Campaign not found');

	return {
		user: locals.user,
		session: locals.session,
		setting: locals.setting,
		...editor,
		previewUrl: `/app/links/${params.id}/safelink/preview`,
		saved: url.searchParams.get('saved') === '1',
		published: url.searchParams.get('published') === '1',
		unpublished: url.searchParams.get('unpublished') === '1'
	};
};

async function readInput(request: Request) {
	try {
		return { input: parseSafelinkFormData(await request.formData()) };
	} catch (cause) {
		return { error: cause instanceof Error ? cause.message : 'Invalid safelink content' };
	}
}

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		const result = await readInput(request);
		if (!result.input) return fail(400, { error: result.error });
		if (!(await saveSafelink(locals.user.id, params.id, result.input))) {
			return fail(404, { error: 'Campaign not found' });
		}
		redirect(303, `?saved=1`);
	},
	publish: async ({ locals, params, request }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		const result = await readInput(request);
		if (!result.input) return fail(400, { error: result.error });
		if (!(await saveSafelink(locals.user.id, params.id, result.input, true))) {
			return fail(404, { error: 'Campaign not found' });
		}
		redirect(303, `?published=1`);
	},
	unpublish: async ({ locals, params }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		if (!(await unpublishSafelink(locals.user.id, params.id))) {
			return fail(404, { error: 'Safelink page not found' });
		}
		redirect(303, `?unpublished=1`);
	}
};
