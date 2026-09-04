import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { db } from '@/server/db';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { authMiddleware, authenticatedAppMiddleware } from '$lib/middleware/auth';
import { adminMiddleware } from '$lib/middleware/admin';
import { apiMiddleware } from '$lib/middleware/api';
import { moderatorMiddleware } from '$lib/middleware/moderator';
import {
	apiRouteRules,
	authRoutes,
	getRouteRule,
	hasMinimumRole,
	matchesAnyRoute,
	matchesRoutePrefix,
	pageRouteRules,
	protectedAppRoutes,
	restrictedModeratorRoutes,
	restrictedSuperAdminRoutes,
	ROLE_LEVELS
} from '$lib/middleware/rules';

import { ServiceHelper } from '@/server/helper';

const getUserPermissionCodes = async (userId: string): Promise<string[]> => {
	const permissions = await db
		.select({ code: schema.permission.code })
		.from(schema.rolePermissions)
		.innerJoin(schema.permission, eq(schema.rolePermissions.permissionId, schema.permission.id))
		.where(eq(schema.rolePermissions.userId, userId));

	return [...new Set(permissions.map((permission) => permission.code))];
};

const initServer: Handle = async ({ event, resolve }) => {
	event.locals.db = db;
	event.locals.helper = new ServiceHelper(event);

	if (
		!event.url.pathname.startsWith('/r/') &&
		!event.url.pathname.startsWith('/s/') &&
		!event.url.pathname.startsWith('/d/') &&
		!event.url.pathname.startsWith('/p/') &&
		!event.url.pathname.startsWith('/e/') &&
		!event.url.pathname.startsWith('/api/embed/')
	) {
		event.locals.setting = await event.locals.helper.setting.getSettings();
	}

	return resolve(event);
};
const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const { url, request, locals } = event;
	locals.auth = auth;

	const pathname = url.pathname;
	const method = request.method;

	if (matchesRoutePrefix(pathname, '/api/auth')) {
		return auth.handler(request);
	}
	if (
		matchesRoutePrefix(pathname, '/r') ||
		matchesRoutePrefix(pathname, '/s') ||
		matchesRoutePrefix(pathname, '/d') ||
		matchesRoutePrefix(pathname, '/p') ||
		matchesRoutePrefix(pathname, '/e') ||
		matchesRoutePrefix(pathname, '/api/embed')
	) {
		return resolve(event);
	}

	const isApiRoute = matchesRoutePrefix(pathname, '/api');
	const isAppRoute = matchesAnyRoute(pathname, protectedAppRoutes);
	const isModeratorRoute = matchesAnyRoute(pathname, restrictedModeratorRoutes);
	const isAdminRoute = matchesAnyRoute(pathname, restrictedSuperAdminRoutes);
	const isAuthRoute = matchesAnyRoute(pathname, authRoutes);
	const routeRule = isApiRoute
		? getRouteRule(pathname, apiRouteRules)
		: getRouteRule(pathname, pageRouteRules);

	try {
		const authSession = await auth.api.getSession({ headers: request.headers });
		if (authSession) {
			locals.session = authSession.session;
			locals.user = authSession.user;
			locals.permissions = await getUserPermissionCodes(authSession.user.id);
		} else {
			locals.session = undefined;
			locals.user = undefined;
			locals.permissions = [];
		}

		const userRoleLevel = locals.user?.role ?? null;
		const isAuthenticated = Boolean(locals.user);
		const hasModerator = hasMinimumRole(userRoleLevel, ROLE_LEVELS.MODERATOR);
		const userPermissions = locals.permissions ?? [];
		const middlewareContext = {
			event,
			resolve,
			isAuthenticated,
			hasModerator,
			userRoleLevel,
			userPermissions,
			routeRule,
			method,
			pathname
		};

		if (isApiRoute) {
			await apiMiddleware(middlewareContext);
			return resolve(event);
		}
		if (isAuthRoute) {
			return await authMiddleware(middlewareContext);
		}
		if (isAdminRoute) {
			return await adminMiddleware(middlewareContext);
		}
		if (isModeratorRoute) {
			return await moderatorMiddleware(middlewareContext);
		}
		if (isAppRoute) {
			return await authenticatedAppMiddleware(middlewareContext);
		}
	} catch (error: any) {
		if (typeof error?.status === 'number' && error.status >= 300 && error.status < 400) {
			throw error;
		}
		if (isApiRoute) {
			return new Response(
				JSON.stringify({
					success: false,
					error: {
						code: error?.body?.code || error?.code || 'INTERNAL_ERROR',
						message: error?.body?.message || error?.message || 'An unexpected error occurred',
						status: error?.status || 500
					}
				}),
				{
					status: error?.status || 500,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}
		if (typeof error?.status === 'number') {
			throw error;
		}
		console.error('Auth middleware error:', error);
		throw error;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = sequence(initServer, handleBetterAuth);
