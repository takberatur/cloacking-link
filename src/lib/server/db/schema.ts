import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  varchar,
  date,
  index,
  jsonb,
  numeric,
  pgEnum,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', [
  'user',
  'moderator',
  'superadmin'
]);
export const userStatusEnum = pgEnum('user_status', [
  'active',
  'inactive',
  'banned'
]);

export const user = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  username: varchar("username", { length: 255 }).unique(),
  email: text('email').notNull().unique(),
  displayUsername: text("display_username"),
  phone: text('phone'),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: userRoleEnum('role').notNull().default('user'),
  status: userStatusEnum('status').notNull().default('active'),
  lastLoginAt: timestamp('last_login_at'),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  twoFactorSecret: text("two_factor_secret"),
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
    index('user_status_idx').on(t.status),
    index('user_email_verified_idx').on(t.emailVerified),
    index('user_last_login_at_idx').on(t.lastLoginAt),
    index('user_created_at_idx').on(t.createdAt),
    index('user_updated_at_idx').on(t.updatedAt),
  ]);

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
    index('session_updated_at_idx').on(t.updatedAt),
  ]
);

export const account = pgTable(
  'account',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    issuer: text("issuer").notNull(),
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
    uniqueIndex("account_issuer_accountId_uidx").on(
      t.issuer,
      t.accountId,
    ),
    index('account_user_id_idx').on(t.userId),
    index('account_account_id_idx').on(t.accountId),
    index('account_provider_id_idx').on(t.providerId),
    index('account_access_token_idx').on(t.accessToken),
    index('account_refresh_token_idx').on(t.refreshToken),
    index('account_id_token_idx').on(t.idToken),
    index('account_access_token_expires_at_idx').on(t.accessTokenExpiresAt),
    index('account_refresh_token_expires_at_idx').on(t.refreshTokenExpiresAt),
    index('account_created_at_idx').on(t.createdAt),
    index('account_updated_at_idx').on(t.updatedAt),
  ]
);

export const verification = pgTable('verification', {
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
    index('verification_updated_at_idx').on(t.updatedAt),
  ]
);

export const role = pgTable('role', {
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
    index('roles_updated_at_idx').on(t.updatedAt),
  ]
);

export const permission = pgTable('permissions', {
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
    index('permissions_updated_at_idx').on(t.updatedAt),
  ]
);

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id')
    .notNull()
    .references(() => role.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id')
    .references(() => permission.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
},
  (t) => [
    index('role_permissions_user_id_idx').on(t.userId),
    index('role_permissions_role_id_idx').on(t.roleId),
    index('role_permissions_permission_id_idx').on(t.permissionId),
    index('role_permissions_created_at_idx').on(t.createdAt),
    index('role_permissions_updated_at_idx').on(t.updatedAt),
  ]
);

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
},
  (t) => [
    index('settings_key_idx').on(t.key),
    index('settings_created_at_idx').on(t.createdAt),
    index('settings_updated_at_idx').on(t.updatedAt),
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
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('api_keys_user_id_idx').on(t.userId),
    index('api_keys_name_idx').on(t.name),
    index('api_keys_key_hash_idx').on(t.keyHash),
    index('api_keys_prefix_idx').on(t.prefix),
    index('api_keys_last_used_at_idx').on(t.lastUsedAt),
    index('api_keys_revoked_at_idx').on(t.revokedAt),
    index('api_keys_created_at_idx').on(t.createdAt),
    index('api_keys_updated_at_idx').on(t.updatedAt),
  ]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  userRoles: many(rolePermissions),
  apiKeys: many(apiKeys)
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


