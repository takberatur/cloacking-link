import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { campaigns } from '$lib/server/db/schema';

export const POST = async ({ request, locals }) => {
	if (!locals.user || !locals.helper) {
		return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });
	}

	const formData = await request.formData();
	const campaignId = String(formData.get('campaignId') ?? '');
	const file = formData.get('media');
	if (!(file instanceof File)) {
		return json({ success: false, message: 'Image is required', data: null }, { status: 400 });
	}

	const campaign = await locals.db.query.campaigns.findFirst({
		where: and(eq(campaigns.id, campaignId), eq(campaigns.ownerId, locals.user.id)),
		columns: { id: true }
	});
	if (!campaign) {
		return json({ success: false, message: 'Campaign not found', data: null }, { status: 404 });
	}

	const uploaded = await locals.helper.cloudinary.uploadFile(
		file,
		'image',
		`safelinks/${locals.user.id}`
	);
	if (uploaded instanceof Error) {
		return json({ success: false, message: uploaded.message, data: null }, { status: 400 });
	}

	return json({ success: true, message: 'Image uploaded', data: { url: uploaded } });
};
