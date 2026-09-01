import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { db } from '@/server/db';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { ServiceHelper } from '@/server/helper';

const initServer: Handle = async ({ event, resolve }) => {
  event.locals.db = db;
  event.locals.helper = new ServiceHelper(event);

  return resolve(event);
};
const handleBetterAuth: Handle = async ({ event, resolve }) => {
  event.locals.auth = auth;

  if (event.url.pathname.startsWith('/api/auth')) {
    return auth.handler(event.request);
  }

  const authSession = await auth.api.getSession({ headers: event.request.headers });

  if (authSession) {
    event.locals.session = authSession.session;
    event.locals.user = authSession.user;
  } else {
    event.locals.session = undefined;
    event.locals.user = undefined;
  }

  return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = sequence(initServer, handleBetterAuth);
