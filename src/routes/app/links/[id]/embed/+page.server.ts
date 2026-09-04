import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getEmbedEditor,
	parseEmbedSettingsFormData,
	rotateEmbedPublicKey,
	saveEmbedSettings
} from '$lib/server/embed';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) redirect(303, '/signin');
	const editor = await getEmbedEditor(locals.user.id, params.id);
	if (!editor) error(404, 'Campaign not found');
	const { setting: embedSetting, ...embedEditor } = editor;
	const scriptUrl = `${url.origin}/e/${embedSetting.publicKey}.js`;

	return {
		user: locals.user,
		setting: locals.setting,
		...embedEditor,
		embedSetting,
		scriptUrl,
		snippet: `<script async src="${scriptUrl}"></script>`,
		linkExample: `<a href="#" data-linkshift>View offer</a>`,
		saved: url.searchParams.get('saved') === '1',
		rotated: url.searchParams.get('rotated') === '1'
	};
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		let input;
		try {
			input = parseEmbedSettingsFormData(await request.formData());
		} catch (cause) {
			return fail(400, {
				error: cause instanceof Error ? cause.message : 'Invalid embed settings'
			});
		}
		if (!(await saveEmbedSettings(locals.user.id, params.id, input))) {
			return fail(404, { error: 'Campaign or embed settings not found' });
		}
		redirect(303, '?saved=1');
	},
	rotate: async ({ locals, params }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });
		if (!(await rotateEmbedPublicKey(locals.user.id, params.id))) {
			return fail(404, { error: 'Campaign or embed settings not found' });
		}
		redirect(303, '?rotated=1');
	}
};
