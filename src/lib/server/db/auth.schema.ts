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

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  username: varchar("username", { length: 255 }).unique(),
  email: text("email").notNull().unique(),
  displayUsername: text("display_username"),
  phone: text("phone"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: userRoleEnum('role').notNull().default('user'),
  status: userStatusEnum('status').notNull().default('active'),
  lastLoginAt: timestamp('last_login_at'),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  twoFactorSecret: text("two_factor_secret"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    index('session_user_id_idx').on(t.userId),
    index('session_token_idx').on(t.token),
    index('session_created_at_idx').on(t.createdAt),
    index('session_updated_at_idx').on(t.updatedAt),
  ]
);

export const account = pgTable(
  "account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issuer: text("issuer").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("account_issuer_accountId_uidx").on(
      table.issuer,
      table.accountId,
    ),
    index("account_userId_idx").on(table.userId),
    index('account_account_id_idx').on(table.accountId),
    index('account_provider_id_idx').on(table.providerId),
    index('account_access_token_idx').on(table.accessToken),
    index('account_refresh_token_idx').on(table.refreshToken),
    index('account_id_token_idx').on(table.idToken),
    index('account_access_token_expires_at_idx').on(table.accessTokenExpiresAt),
    index('account_refresh_token_expires_at_idx').on(table.refreshTokenExpiresAt),
    index('account_created_at_idx').on(table.createdAt),
    index('account_updated_at_idx').on(table.updatedAt),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("verification_identifier_idx").on(table.identifier),
    index('verification_expires_at_idx').on(table.expiresAt),
    index('verification_created_at_idx').on(table.createdAt),
    index('verification_updated_at_idx').on(table.updatedAt),
  ],
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

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  userRoles: many(rolePermissions),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const roleRelations = relations(role, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const permissionRelations = relations(permission, ({ many }) => ({
  permissionRoles: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  user: one(user, {
    fields: [rolePermissions.userId],
    references: [user.id],
  }),
  role: one(role, {
    fields: [rolePermissions.roleId],
    references: [role.id],
  }),
  permission: one(permission, {
    fields: [rolePermissions.permissionId],
    references: [permission.id],
  }),
}));
