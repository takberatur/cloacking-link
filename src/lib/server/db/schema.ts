import {
	pgTable,
	integer,
	text,
	boolean,
	varchar,
	index,
	jsonb,
	pgEnum,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', ['user', 'moderator', 'superadmin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'banned']);
export const campaignStatusEnum = pgEnum('campaign_status', [
	'draft',
	'active',
	'paused',
	'archived'
]);
export const redirectTypeEnum = pgEnum('redirect_type', ['direct', 'safelink', 'deeplink']);
export const rotationStrategyEnum = pgEnum('rotation_strategy', [
	'equal',
	'percentage',
	'priority'
]);
export const destinationTypeEnum = pgEnum('destination_type', [
	'affiliate',
	'cpa',
	'direct',
	'popunder'
]);
export const destinationPlatformEnum = pgEnum('destination_platform', [
	'generic',
	'amazon',
	'ebay',
	'shopee',
	'tiktok',
	'traveloka',
	'custom'
]);
export const geoModeEnum = pgEnum('geo_mode', ['all', 'include', 'exclude']);
export const blockRuleTypeEnum = pgEnum('block_rule_type', [
	'country',
	'ip',
	'ip_range',
	'device',
	'os',
	'browser',
	'bot',
	'user_agent',
	'referrer',
	'asn'
]);
export const blockRuleActionEnum = pgEnum('block_rule_action', ['block', 'allow', 'redirect']);
export const blockRuleOperatorEnum = pgEnum('block_rule_operator', [
	'equals',
	'not_equals',
	'contains',
	'not_contains',
	'in',
	'not_in',
	'matches',
	'cidr'
]);
export const clickOutcomeEnum = pgEnum('click_outcome', [
	'redirected',
	'blocked',
	'fallback',
	'safelink',
	'error'
]);
export const safelinkStatusEnum = pgEnum('safelink_status', ['draft', 'published']);
export const popunderBehaviorEnum = pgEnum('popunder_behavior', [
	'background',
	'new_tab',
	'same_tab'
]);

export const user = pgTable(
	'user',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: text('name').notNull(),
		username: varchar('username', { length: 255 }).unique(),
		email: text('email').notNull().unique(),
		displayUsername: text('display_username'),
		phone: text('phone'),
		emailVerified: boolean('email_verified').notNull().default(false),
		image: text('image'),
		role: userRoleEnum('role').notNull().default('user'),
		banned: boolean('banned').notNull().default(false),
		banReason: text('ban_reason'),
		banExpires: timestamp('ban_expires'),
		status: userStatusEnum('status').notNull().default('active'),
		lastLoginAt: timestamp('last_login_at'),
		twoFactorEnabled: boolean('two_factor_enabled').default(false).notNull(),
		twoFactorSecret: text('two_factor_secret'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('user_name_idx').on(t.name),
		index('user_id_idx').on(t.id),
		index('user_username_idx').on(t.username),
		index('user_email_idx').on(t.email),
		index('user_phone_idx').on(t.phone),
		index('user_role_idx').on(t.role),
		index('user_banned_idx').on(t.banned),
		index('user_ban_expires_idx').on(t.banExpires),
		index('user_two_factor_enabled_idx').on(t.twoFactorEnabled),
		index('user_status_idx').on(t.status),
		index('user_email_verified_idx').on(t.emailVerified),
		index('user_last_login_at_idx').on(t.lastLoginAt),
		index('user_created_at_idx').on(t.createdAt),
		index('user_updated_at_idx').on(t.updatedAt)
	]
);

export const session = pgTable(
	'session',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		expiresAt: timestamp('expires_at').notNull(),
		token: text('token').notNull().unique(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: uuid('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		impersonatedBy: text('impersonated_by'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => [
		index('session_user_id_idx').on(t.userId),
		index('session_token_idx').on(t.token),
		index('session_created_at_idx').on(t.createdAt),
		index('session_updated_at_idx').on(t.updatedAt)
	]
);

export const account = pgTable(
	'account',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		issuer: text('issuer').notNull(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: uuid('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('account_issuer_accountId_uidx').on(t.issuer, t.accountId),
		index('account_user_id_idx').on(t.userId),
		index('account_account_id_idx').on(t.accountId),
		index('account_provider_id_idx').on(t.providerId),
		index('account_access_token_idx').on(t.accessToken),
		index('account_refresh_token_idx').on(t.refreshToken),
		index('account_id_token_idx').on(t.idToken),
		index('account_access_token_expires_at_idx').on(t.accessTokenExpiresAt),
		index('account_refresh_token_expires_at_idx').on(t.refreshTokenExpiresAt),
		index('account_created_at_idx').on(t.createdAt),
		index('account_updated_at_idx').on(t.updatedAt)
	]
);

export const verification = pgTable(
	'verification',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => [
		index('verification_identifier_idx').on(t.identifier),
		index('verification_expires_at_idx').on(t.expiresAt),
		index('verification_created_at_idx').on(t.createdAt),
		index('verification_updated_at_idx').on(t.updatedAt)
	]
);

export const role = pgTable(
	'role',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: userRoleEnum('name').notNull().unique(),
		level: integer('level').notNull().default(0), // 0: user, 1: moderator, 2: superadmin
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => [
		index('roles_name_idx').on(t.name),
		index('roles_level_idx').on(t.level),
		index('roles_created_at_idx').on(t.createdAt),
		index('roles_updated_at_idx').on(t.updatedAt)
	]
);

export const permission = pgTable(
	'permissions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		code: text('code').notNull().unique(),
		description: text('description').default(''), // user, 1: moderator, 2: superadmin
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => [
		index('permissions_code_idx').on(t.code),
		index('permissions_description_idx').on(t.description),
		index('permissions_created_at_idx').on(t.createdAt),
		index('permissions_updated_at_idx').on(t.updatedAt)
	]
);

export const rolePermissions = pgTable(
	'role_permissions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		roleId: uuid('role_id')
			.notNull()
			.references(() => role.id, { onDelete: 'cascade' }),
		permissionId: uuid('permission_id').references(() => permission.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => [
		index('role_permissions_user_id_idx').on(t.userId),
		index('role_permissions_role_id_idx').on(t.roleId),
		index('role_permissions_permission_id_idx').on(t.permissionId),
		index('role_permissions_created_at_idx').on(t.createdAt),
		index('role_permissions_updated_at_idx').on(t.updatedAt)
	]
);

export const twoFactor = pgTable(
	'two_factor',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		secret: text('secret').notNull(),
		backupCodes: text('backup_codes').notNull(),
		userId: uuid('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		verified: boolean('verified').notNull().default(true),
		failedVerificationCount: integer('failed_verification_count').notNull().default(0),
		lockedUntil: timestamp('locked_until')
	},
	(t) => [
		index('two_factor_secret_idx').on(t.secret),
		index('two_factor_user_id_idx').on(t.userId),
		index('two_factor_verified_idx').on(t.verified),
		index('two_factor_locked_until_idx').on(t.lockedUntil)
	]
);

export const settings = pgTable(
	'settings',
	{
		key: text('key').primaryKey(),
		value: jsonb('value').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => [
		index('settings_key_idx').on(t.key),
		index('settings_created_at_idx').on(t.createdAt),
		index('settings_updated_at_idx').on(t.updatedAt)
	]
);

export const apiKeys = pgTable(
	'api_keys',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		keyHash: text('key_hash').notNull().unique(),
		prefix: text('prefix').notNull(), // first chars for display, e.g. sk_live_ab12
		lastUsedAt: timestamp('last_used_at'),
		revokedAt: timestamp('revoked_at'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => [
		index('api_keys_user_id_idx').on(t.userId),
		index('api_keys_name_idx').on(t.name),
		index('api_keys_key_hash_idx').on(t.keyHash),
		index('api_keys_prefix_idx').on(t.prefix),
		index('api_keys_last_used_at_idx').on(t.lastUsedAt),
		index('api_keys_revoked_at_idx').on(t.revokedAt),
		index('api_keys_created_at_idx').on(t.createdAt),
		index('api_keys_updated_at_idx').on(t.updatedAt)
	]
);

export const auditLogs = pgTable(
	'audit_logs',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		actorId: uuid('actor_id'),
		action: text('action').notNull(), // e.g. user.ban, publisher.delete, payout.execute
		targetType: text('target_type'),
		targetId: text('target_id'),
		meta: jsonb('meta'),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(t) => [index('audit_actor_idx').on(t.actorId, t.createdAt)]
);

export const campaigns = pgTable(
	'campaigns',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		ownerId: uuid('owner_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 160 }).notNull(),
		slug: varchar('slug', { length: 120 }).notNull().unique(),
		description: text('description'),
		status: campaignStatusEnum('status').notNull().default('draft'),
		redirectType: redirectTypeEnum('redirect_type').notNull().default('direct'),
		rotationStrategy: rotationStrategyEnum('rotation_strategy').notNull().default('equal'),
		fallbackUrl: text('fallback_url'),
		redirectCode: integer('redirect_code').notNull().default(302),
		preserveQueryParams: boolean('preserve_query_params').notNull().default(true),
		stripReferrer: boolean('strip_referrer').notNull().default(false),
		botProtectionEnabled: boolean('bot_protection_enabled').notNull().default(true),
		trackingEnabled: boolean('tracking_enabled').notNull().default(true),
		timezone: varchar('timezone', { length: 64 }).notNull().default('UTC'),
		startsAt: timestamp('starts_at', { withTimezone: true }),
		endsAt: timestamp('ends_at', { withTimezone: true }),
		metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('campaigns_owner_status_idx').on(t.ownerId, t.status),
		index('campaigns_owner_created_at_idx').on(t.ownerId, t.createdAt),
		index('campaigns_status_schedule_idx').on(t.status, t.startsAt, t.endsAt),
		index('campaigns_slug_idx').on(t.slug)
	]
);

export const destinations = pgTable(
	'destinations',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		campaignId: uuid('campaign_id')
			.notNull()
			.references(() => campaigns.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 160 }).notNull(),
		url: text('url').notNull(),
		type: destinationTypeEnum('type').notNull().default('affiliate'),
		platform: destinationPlatformEnum('platform').notNull().default('generic'),
		enabled: boolean('enabled').notNull().default(true),
		weight: integer('weight').notNull().default(100),
		priority: integer('priority').notNull().default(0),
		position: integer('position').notNull().default(0),
		geoMode: geoModeEnum('geo_mode').notNull().default('all'),
		maxDailyClicks: integer('max_daily_clicks'),
		activeFrom: timestamp('active_from', { withTimezone: true }),
		activeUntil: timestamp('active_until', { withTimezone: true }),
		metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('destinations_campaign_position_uidx').on(t.campaignId, t.position),
		index('destinations_campaign_enabled_idx').on(t.campaignId, t.enabled),
		index('destinations_campaign_priority_idx').on(t.campaignId, t.priority),
		index('destinations_active_window_idx').on(t.activeFrom, t.activeUntil)
	]
);

export const destinationGeoTargets = pgTable(
	'destination_geo_targets',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		destinationId: uuid('destination_id')
			.notNull()
			.references(() => destinations.id, { onDelete: 'cascade' }),
		countryCode: varchar('country_code', { length: 2 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('destination_geo_targets_destination_country_uidx').on(
			t.destinationId,
			t.countryCode
		),
		index('destination_geo_targets_country_idx').on(t.countryCode)
	]
);

export const destinationDeepLinks = pgTable(
	'destination_deep_links',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		destinationId: uuid('destination_id')
			.notNull()
			.unique()
			.references(() => destinations.id, { onDelete: 'cascade' }),
		androidScheme: text('android_scheme'),
		androidPackageName: varchar('android_package_name', { length: 255 }),
		androidStoreUrl: text('android_store_url'),
		iosScheme: text('ios_scheme'),
		iosAppId: varchar('ios_app_id', { length: 64 }),
		iosStoreUrl: text('ios_store_url'),
		universalLink: text('universal_link'),
		webFallbackUrl: text('web_fallback_url'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('destination_deep_links_destination_idx').on(t.destinationId)]
);

export const blockRules = pgTable(
	'block_rules',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		ownerId: uuid('owner_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 160 }).notNull(),
		type: blockRuleTypeEnum('type').notNull(),
		operator: blockRuleOperatorEnum('operator').notNull().default('equals'),
		action: blockRuleActionEnum('action').notNull().default('block'),
		value: text('value').notNull(),
		redirectUrl: text('redirect_url'),
		enabled: boolean('enabled').notNull().default(true),
		position: integer('position').notNull().default(0),
		note: text('note'),
		metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('block_rules_owner_campaign_idx').on(t.ownerId, t.campaignId),
		index('block_rules_campaign_enabled_position_idx').on(t.campaignId, t.enabled, t.position),
		index('block_rules_owner_global_idx').on(t.ownerId, t.enabled, t.position)
	]
);

export const visitors = pgTable(
	'visitors',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		ownerId: uuid('owner_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		visitorKeyHash: varchar('visitor_key_hash', { length: 128 }).notNull(),
		firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
		totalVisits: integer('total_visits').notNull().default(1),
		lastCountryCode: varchar('last_country_code', { length: 2 }),
		lastDeviceType: varchar('last_device_type', { length: 32 }),
		lastBrowser: varchar('last_browser', { length: 64 }),
		lastOs: varchar('last_os', { length: 64 }),
		metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({})
	},
	(t) => [
		uniqueIndex('visitors_owner_key_hash_uidx').on(t.ownerId, t.visitorKeyHash),
		index('visitors_owner_last_seen_idx').on(t.ownerId, t.lastSeenAt)
	]
);

export const safelinkPages = pgTable(
	'safelink_pages',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		campaignId: uuid('campaign_id')
			.notNull()
			.unique()
			.references(() => campaigns.id, { onDelete: 'cascade' }),
		title: varchar('title', { length: 200 }).notNull(),
		status: safelinkStatusEnum('status').notNull().default('draft'),
		document: jsonb('document').$type<Record<string, unknown>>().notNull().default({}),
		publishedDocument: jsonb('published_document').$type<Record<string, unknown>>(),
		theme: jsonb('theme').$type<Record<string, unknown>>().notNull().default({}),
		customCss: text('custom_css'),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('safelink_pages_campaign_status_idx').on(t.campaignId, t.status)]
);

export const popunderSettings = pgTable(
	'popunder_settings',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		campaignId: uuid('campaign_id')
			.notNull()
			.unique()
			.references(() => campaigns.id, { onDelete: 'cascade' }),
		enabled: boolean('enabled').notNull().default(false),
		targetUrl: text('target_url').notNull(),
		behavior: popunderBehaviorEnum('behavior').notNull().default('background'),
		delayMs: integer('delay_ms').notNull().default(0),
		frequencyCap: integer('frequency_cap').notNull().default(1),
		frequencyWindowHours: integer('frequency_window_hours').notNull().default(24),
		browserRules: jsonb('browser_rules').$type<Record<string, unknown>>().notNull().default({}),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('popunder_settings_campaign_enabled_idx').on(t.campaignId, t.enabled)]
);

export const clickEvents = pgTable(
	'click_events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		requestId: uuid('request_id').notNull().defaultRandom().unique(),
		ownerId: uuid('owner_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		campaignId: uuid('campaign_id')
			.notNull()
			.references(() => campaigns.id, { onDelete: 'cascade' }),
		destinationId: uuid('destination_id').references(() => destinations.id, {
			onDelete: 'set null'
		}),
		visitorId: uuid('visitor_id').references(() => visitors.id, { onDelete: 'set null' }),
		blockRuleId: uuid('block_rule_id').references(() => blockRules.id, { onDelete: 'set null' }),
		outcome: clickOutcomeEnum('outcome').notNull(),
		redirectType: redirectTypeEnum('redirect_type'),
		countryCode: varchar('country_code', { length: 2 }),
		regionCode: varchar('region_code', { length: 16 }),
		city: varchar('city', { length: 120 }),
		timezone: varchar('timezone', { length: 64 }),
		ipHash: varchar('ip_hash', { length: 128 }),
		deviceType: varchar('device_type', { length: 32 }),
		os: varchar('os', { length: 64 }),
		browser: varchar('browser', { length: 64 }),
		userAgent: text('user_agent'),
		referrer: text('referrer'),
		language: varchar('language', { length: 32 }),
		isUnique: boolean('is_unique').notNull().default(false),
		isBot: boolean('is_bot').notNull().default(false),
		botScore: integer('bot_score').notNull().default(0),
		riskScore: integer('risk_score').notNull().default(0),
		responseTimeMs: integer('response_time_ms'),
		queryParams: jsonb('query_params')
			.$type<Record<string, string | string[]>>()
			.notNull()
			.default({}),
		metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
		occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('click_events_owner_occurred_at_idx').on(t.ownerId, t.occurredAt),
		index('click_events_campaign_occurred_at_idx').on(t.campaignId, t.occurredAt),
		index('click_events_campaign_outcome_occurred_idx').on(t.campaignId, t.outcome, t.occurredAt),
		index('click_events_destination_occurred_at_idx').on(t.destinationId, t.occurredAt),
		index('click_events_visitor_occurred_at_idx').on(t.visitorId, t.occurredAt),
		index('click_events_country_occurred_at_idx').on(t.countryCode, t.occurredAt),
		index('click_events_ip_hash_occurred_at_idx').on(t.ipHash, t.occurredAt)
	]
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	userRoles: many(rolePermissions),
	apiKeys: many(apiKeys),
	twoFactors: many(twoFactor),
	campaigns: many(campaigns),
	blockRules: many(blockRules),
	visitors: many(visitors),
	clickEvents: many(clickEvents)
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	})
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	})
}));

export const roleRelations = relations(role, ({ many }) => ({
	rolePermissions: many(rolePermissions)
}));

export const permissionRelations = relations(permission, ({ many }) => ({
	permissionRoles: many(rolePermissions)
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
	user: one(user, {
		fields: [rolePermissions.userId],
		references: [user.id]
	}),
	role: one(role, {
		fields: [rolePermissions.roleId],
		references: [role.id]
	}),
	permission: one(permission, {
		fields: [rolePermissions.permissionId],
		references: [permission.id]
	})
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
	user: one(user, {
		fields: [apiKeys.userId],
		references: [user.id]
	})
}));

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
	user: one(user, {
		fields: [twoFactor.userId],
		references: [user.id]
	})
}));

export const campaignRelations = relations(campaigns, ({ one, many }) => ({
	owner: one(user, {
		fields: [campaigns.ownerId],
		references: [user.id]
	}),
	destinations: many(destinations),
	blockRules: many(blockRules),
	clickEvents: many(clickEvents),
	safelinkPage: one(safelinkPages),
	popunderSetting: one(popunderSettings)
}));

export const destinationRelations = relations(destinations, ({ one, many }) => ({
	campaign: one(campaigns, {
		fields: [destinations.campaignId],
		references: [campaigns.id]
	}),
	geoTargets: many(destinationGeoTargets),
	deepLink: one(destinationDeepLinks),
	clickEvents: many(clickEvents)
}));

export const destinationGeoTargetRelations = relations(destinationGeoTargets, ({ one }) => ({
	destination: one(destinations, {
		fields: [destinationGeoTargets.destinationId],
		references: [destinations.id]
	})
}));

export const destinationDeepLinkRelations = relations(destinationDeepLinks, ({ one }) => ({
	destination: one(destinations, {
		fields: [destinationDeepLinks.destinationId],
		references: [destinations.id]
	})
}));

export const blockRuleRelations = relations(blockRules, ({ one, many }) => ({
	owner: one(user, {
		fields: [blockRules.ownerId],
		references: [user.id]
	}),
	campaign: one(campaigns, {
		fields: [blockRules.campaignId],
		references: [campaigns.id]
	}),
	clickEvents: many(clickEvents)
}));

export const visitorRelations = relations(visitors, ({ one, many }) => ({
	owner: one(user, {
		fields: [visitors.ownerId],
		references: [user.id]
	}),
	clickEvents: many(clickEvents)
}));

export const safelinkPageRelations = relations(safelinkPages, ({ one }) => ({
	campaign: one(campaigns, {
		fields: [safelinkPages.campaignId],
		references: [campaigns.id]
	})
}));

export const popunderSettingRelations = relations(popunderSettings, ({ one }) => ({
	campaign: one(campaigns, {
		fields: [popunderSettings.campaignId],
		references: [campaigns.id]
	})
}));

export const clickEventRelations = relations(clickEvents, ({ one }) => ({
	owner: one(user, {
		fields: [clickEvents.ownerId],
		references: [user.id]
	}),
	campaign: one(campaigns, {
		fields: [clickEvents.campaignId],
		references: [campaigns.id]
	}),
	destination: one(destinations, {
		fields: [clickEvents.destinationId],
		references: [destinations.id]
	}),
	visitor: one(visitors, {
		fields: [clickEvents.visitorId],
		references: [visitors.id]
	}),
	blockRule: one(blockRules, {
		fields: [clickEvents.blockRuleId],
		references: [blockRules.id]
	})
}));
