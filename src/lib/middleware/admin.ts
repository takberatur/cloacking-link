import { redirect, error } from '@sveltejs/kit';
import { buildSignInRedirect, hasPermissions, hasRole, ROLE_LEVELS } from '$lib/middleware/rules';

export const adminMiddleware = async (handler: RequestHandlerParams) => {
	const { event, resolve, isAuthenticated, routeRule, userRoleLevel, userPermissions } = handler;

	if (!isAuthenticated) {
		throw redirect(302, buildSignInRedirect(`${event.url.pathname}${event.url.search}`));
	}

	const rule = routeRule ?? { roles: [ROLE_LEVELS.SUPERADMIN] };

	if (
		!hasRole(userRoleLevel, rule.roles) ||
		!hasPermissions(userRoleLevel, userPermissions, rule.permissions)
	) {
		throw error(403, {
			message: 'You do not have permission to access this resource',
			code: 'FORBIDDEN'
		});
	}

	return resolve(event);
};
