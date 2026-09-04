export const ROLE_LEVELS = {
	USER: 'user',
	MODERATOR: 'moderator',
	SUPERADMIN: 'superadmin'
} as const;

export type UserRole = (typeof ROLE_LEVELS)[keyof typeof ROLE_LEVELS];
export type PermissionCode = 'user:read' | 'user:write' | 'user:delete' | 'system:settings';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type MiddlewareRouteConfig = {
	public?: boolean;
	roles?: UserRole[];
	permissions?: PermissionCode[];
	methods?: HttpMethod[];
	redirectAuthenticatedTo?: string;
};
export type RouteRules = Record<string, MiddlewareRouteConfig>;

const ROLE_RANK: Record<UserRole, number> = {
	[ROLE_LEVELS.USER]: 0,
	[ROLE_LEVELS.MODERATOR]: 1,
	[ROLE_LEVELS.SUPERADMIN]: 2
};

export const allowedWhenAuthenticated = ['/signout'] as const;
export const authRoutes = [
	'/signin',
	'/signup',
	'/otp-verification',
	'/reset-password',
	'/2fa',
	'/forgot-password'
] as const;

export const protectedAppRoutes = ['/app'] as const;
export const restrictedSuperAdminRoutes = ['/app/settings'] as const;
export const restrictedModeratorRoutes = ['/app/users'] as const;

export const publicApiRoutes = ['/api/auth', '/api/public', '/api/link', '/api/embed'] as const;
export const adminApiRoutes = ['/api/admin', '/api/setting'] as const;
export const moderatorApiRoutes = ['/api/moderator'] as const;
export const userApiRoutes = ['/api/user'] as const;

export const pageRouteRules = {
	'/app/settings': {
		roles: [ROLE_LEVELS.SUPERADMIN],
		permissions: ['system:settings']
	},
	'/app/users': {
		roles: [ROLE_LEVELS.MODERATOR, ROLE_LEVELS.SUPERADMIN]
	},
	'/app': {
		roles: [ROLE_LEVELS.USER, ROLE_LEVELS.MODERATOR, ROLE_LEVELS.SUPERADMIN]
	}
} satisfies RouteRules;

export const apiRouteRules = {
	'/api/auth': { public: true },
	'/api/public': { public: true },
	'/api/link': { public: true },
	'/api/embed': { public: true },
	'/api/setting': {
		roles: [ROLE_LEVELS.SUPERADMIN],
		permissions: ['system:settings'],
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
	},
	'/api/admin': {
		roles: [ROLE_LEVELS.SUPERADMIN],
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
	},
	'/api/moderator': {
		roles: [ROLE_LEVELS.MODERATOR, ROLE_LEVELS.SUPERADMIN],
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
	},
	'/api/user': {
		roles: [ROLE_LEVELS.USER, ROLE_LEVELS.MODERATOR, ROLE_LEVELS.SUPERADMIN]
	}
} satisfies RouteRules;

export function matchesRoutePrefix(pathname: string, prefix: string): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function matchesAnyRoute(pathname: string, routes: readonly string[]): boolean {
	return routes.some((route) => matchesRoutePrefix(pathname, route));
}

export function isUser(roleLevel?: string | null): boolean {
	return roleLevel === ROLE_LEVELS.USER;
}
export function isSuperAdmin(roleLevel?: string | null): boolean {
	return roleLevel === ROLE_LEVELS.SUPERADMIN;
}
export function isModerator(roleLevel?: string | null): boolean {
	return roleLevel === ROLE_LEVELS.MODERATOR;
}

export function canManageUser(roleLevel?: string | null): boolean {
	return roleLevel === ROLE_LEVELS.SUPERADMIN || roleLevel === ROLE_LEVELS.MODERATOR;
}

export function hasRole(
	currentRole: string | null | undefined,
	allowedRoles: readonly UserRole[] = []
): boolean {
	if (allowedRoles.length === 0) return true;
	if (!currentRole || !(currentRole in ROLE_RANK)) return false;
	return allowedRoles.includes(currentRole as UserRole);
}

export function hasMinimumRole(
	currentRole: string | null | undefined,
	minimumRole: UserRole
): boolean {
	if (!currentRole || !(currentRole in ROLE_RANK)) return false;
	return ROLE_RANK[currentRole as UserRole] >= ROLE_RANK[minimumRole];
}

export function hasPermissions(
	currentRole: string | null | undefined,
	userPermissions: readonly string[] = [],
	requiredPermissions: readonly string[] = []
): boolean {
	if (requiredPermissions.length === 0) return true;
	if (isSuperAdmin(currentRole)) return true;

	const permissionSet = new Set(userPermissions);
	return requiredPermissions.every((permission) => permissionSet.has(permission));
}

export function getRouteRule(
	pathname: string,
	rules: RouteRules
): MiddlewareRouteConfig | undefined {
	const route = Object.keys(rules)
		.filter((candidate) => matchesRoutePrefix(pathname, candidate))
		.sort((a, b) => b.length - a.length)[0];

	return route ? rules[route] : undefined;
}

export function sanitizeRedirectTarget(
	target: string | null | undefined,
	fallback = '/app'
): string {
	if (!target || !target.startsWith('/') || target.startsWith('//')) {
		return fallback;
	}

	return target;
}

export function buildSignInRedirect(pathname: string): string {
	return `/signin?redirect=${encodeURIComponent(pathname)}`;
}
