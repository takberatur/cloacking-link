import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import {
	apiRouteRules,
	getRouteRule,
	hasPermissions,
	hasRole,
	type HttpMethod,
	matchesAnyRoute,
	matchesRoutePrefix,
	publicApiRoutes
} from '$lib/middleware/rules';

export const apiMiddleware = async ({
	method,
	pathname,
	isAuthenticated,
	userRoleLevel,
	userPermissions,
	routeRule
}: ApiMiddlewareParams) => {
	if (!matchesRoutePrefix(pathname, '/api')) {
		return { allowed: true };
	}

	const rule = routeRule ?? getRouteRule(pathname, apiRouteRules);

	if (rule?.public || matchesAnyRoute(pathname, publicApiRoutes)) {
		return { allowed: true };
	}

	if (!isAuthenticated) {
		throw error(401, {
			message: 'Authentication required',
			code: 'UNAUTHORIZED'
		});
	}

	if (rule?.methods?.length && !rule.methods.includes(method as HttpMethod)) {
		throw error(405, {
			message: 'Method not allowed',
			code: 'METHOD_NOT_ALLOWED'
		});
	}

	if (
		!hasRole(userRoleLevel, rule?.roles) ||
		!hasPermissions(userRoleLevel, userPermissions, rule?.permissions)
	) {
		throw error(403, {
			message: 'Insufficient permissions for this action',
			code: 'FORBIDDEN'
		});
	}

	return { allowed: true };
};

export const validateApiRequest = async (event: RequestEvent, schema?: any) => {
	if (event.request.method === 'GET' || event.request.method === 'DELETE') {
		return { valid: true };
	}

	try {
		const body = await event.request.json();

		if (schema) {
			// const result = schema.safeParse(body);
			// if (!result.success) {
			// 	throw error(400, {
			// 		message: 'Invalid request body',
			// 		code: 'VALIDATION_ERROR',
			// 		details: result.error.errors
			// 	});
			// }
			// return { valid: true, data: result.data };
		}

		return { valid: true, data: body };
	} catch (err) {
		throw error(400, {
			message: 'Invalid JSON body',
			code: 'INVALID_JSON'
		});
	}
};
