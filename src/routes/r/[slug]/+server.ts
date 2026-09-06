import type { RequestHandler } from './$types';
import { handlePublicRedirect } from '$lib/server/redirect/http';

export const GET: RequestHandler = (event) => handlePublicRedirect(event, event.params.slug);
