import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSafelinkEditor, safelinkViewModel } from '$lib/server/safelink';

export const load: PageServerLoad = async ({ locals, params, setHeaders }) => {
	if (!locals.user) redirect(303, '/signin');
	const editor = await getSafelinkEditor(locals.user.id, params.id);
	if (!editor) error(404, 'Campaign not found');

	setHeaders({ 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' });
	return { view: safelinkViewModel(editor.page, true) };
};
