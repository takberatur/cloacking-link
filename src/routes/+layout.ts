
import { createAppQueryClient } from '$lib/query/query.client.js';
export const load = async ({ data }) => {
    const { baseMetaTags, user, session, setting } = data;
    const queryClient = createAppQueryClient();

    return {
        baseMetaTags,
        user,
        session,
        setting,
        queryClient,
    };
}