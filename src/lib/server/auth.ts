import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { adminAc, userAc } from 'better-auth/plugins/admin/access';
import { admin } from 'better-auth/plugins';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { sendEmail } from './email';

export const auth = betterAuth({
  baseURL: env.ORIGIN,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      role: schema.role,
      permission: schema.permission,
      rolePermissions: schema.rolePermissions,
      userRelations: schema.userRelations,
      sessionRelations: schema.sessionRelations,
      accountRelations: schema.accountRelations,
      roleRelations: schema.roleRelations,
      permissionRelations: schema.permissionRelations,
      rolePermissionsRelations: schema.rolePermissionsRelations,
    }
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: `Reset your ${env.APP_NAME} password`,
        html: `<p>Hi ${user.name},</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${url}">Reset password</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
      });
    }
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    }
  },
  user: {
    changeEmail: {
      enabled: true
    },
    additionalFields: {
      role: { type: 'string', required: false, input: false }
    }
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID()
    },
    cookiePrefix: 'x-link-cloacking-',
    useSecureCookies: true,
    crossSubDomainCookies: {
      enabled: true,
      domain: env.ORIGIN
    }
  },
  plugins: [
    admin({
      defaultRole: 'user',
      adminRoles: ['superadmin', 'moderator'],
      roles: {
        user: userAc,
        moderator: adminAc,
        superadmin: adminAc
      }
    }),
    sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
  ]
});

export type AuthType = typeof auth;
export type Session = AuthType['$Infer']['Session'];
export type AuthUser = Session['user'];
export type Role = typeof schema.userRoleEnum.enumValues[number];
export const userRoleEnum = schema.userRoleEnum;
