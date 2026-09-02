import type { RequestEvent } from '@sveltejs/kit';
import { db } from '@/server/db';
import type { AuthSession, AuthType, AuthUser } from '$lib/server/auth';
import type { RedisClient } from '$lib/server/redis';
import type { ServiceHelper } from '@/server/helper';
import type { MiddlewareRouteConfig } from '$lib/middleware/rules';
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Error {
			code?: string;
		}
		interface Locals {
			user?: AuthUser;
			session?: AuthSession;
			db: typeof db;
			auth?: AuthType;
			helper?: ServiceHelper;
			redis?: RedisClient;
			setting?: SiteSetting;
			safeGetSettings?: () => Promise<SiteSetting>;
			permissions?: string[];
		}
		interface PageData {
			user?: AuthUser | null;
			session?: AuthSession;
			success?: boolean;
			errors?: {
				code: string;
				message: string;
				details?: any;
			};
			messages?: string;
		}
		// interface PageState {}
		// interface Platform {}
	}
	interface RequestHandlerParams {
		event: RequestEvent;
		resolve: (event: RequestEvent) => MaybePromise<Response>;
		isAuthenticated: boolean;
		hasModerator: boolean;
		userRoleLevel: string | null;
		userPermissions: string[];
		routeRule?: MiddlewareRouteConfig;
		method: string;
		pathname: string;
	}
	interface RouteConfig {
		public?: boolean;
		roles?: ('superadmin' | 'moderator' | 'user')[];
		permissions?: string[];
		roleLevel?: (2 | 1 | 0)[];
		methods?: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[];
		tenantRequired?: boolean;
	}
	interface RouteRules {
		[key: string]: RouteConfig;
	}

	interface ApiMiddlewareParams {
		event: RequestEvent;
		method: string;
		pathname: string;
		isAuthenticated: boolean;
		userRoleLevel: string | null;
		hasModerator: boolean;
		userPermissions: string[];
		routeRule?: MiddlewareRouteConfig;
	}
}

export {};
