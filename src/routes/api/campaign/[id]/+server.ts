import { json } from '@sveltejs/kit';
import { deleteCampaign, listCampaigns, setCampaignStatus } from '$lib/server/campaign';

export const DELETE = async ({ params, locals }) => {
  const { helper } = locals
  try {
    const campaignId = params.id
    if (!campaignId) return json({
      success: false,
      message: 'Campaign ID is required'
    }, {
      status: 400
    });


    if (!locals.user) return json({
      success: false,
      message: 'Authentication required'
    }, {
      status: 401
    });

    const deleted = await deleteCampaign(locals.user?.id, campaignId);
    if (!deleted) return json({
      success: false,
      message: 'Campaign not found'
    }, {
      status: 404
    });

    return json({
      success: true,
      message: 'Campaign deleted'
    }, {
      status: 200
    })

  } catch (error) {
    return json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    })
  }
}