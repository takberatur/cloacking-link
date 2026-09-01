import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { adminAc, userAc } from 'better-auth/plugins/admin/access';
import { admin } from 'better-auth/plugins';
import { twoFactor } from "better-auth/plugins"
import { emailOTP } from "better-auth/plugins"
import { username } from "better-auth/plugins"
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
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "sign-in") {
          await sendEmail({
            to: email,
            subject: `Sign in to ${env.APP_NAME}`,
            html: `<p>Your sign-in code is: <b>${otp}</b>. It expires in 1 hour.</p>`,
          });
        } else if (type === "email-verification") {
          await sendEmail({
            to: email,
            subject: `Verify your email for ${env.APP_NAME}`,
            html: `<p>Your verification code is: <b>${otp}</b>.</p>`,
          });
        } else if (type === "forget-password") {
          await sendEmail({
            to: email,
            subject: `Reset your password for ${env.APP_NAME}`,
            html: `<p>Your password reset code is: <b>${otp}</b>.</p>`,
          });
        } else {
          // change email alert to unknown OTP type
          await sendEmail({
            to: email,
            subject: `Unknown OTP type: ${type}`,
            html: `<p>Notification: ${type}</p><p>Please contact the administrator for more information.</p>`,
          });
        }
      },
    }),
    username({
      immutableUsername: true,
      minUsernameLength: 5,
      maxUsernameLength: 100,
      usernameValidator: (username) => {
        if (username === "admin") {
          return false
        }
        return true
      },
      displayUsernameValidator: (displayUsername) => {
        return /^[a-zA-Z0-9_-]+$/.test(displayUsername)
      },
      usernameNormalization: (username) => {
        return username.toLowerCase()
          .replaceAll("0", "o")
          .replaceAll("3", "e")
          .replaceAll("4", "a");
      },
      displayUsernameNormalization: (displayUsername) => displayUsername.toLowerCase(),
    }),
    twoFactor({
      issuer: env.APP_NAME || "Link Shift",
      otpOptions: {
        async sendOTP({ user, otp }) {
          await sendEmail({
            to: user.email,
            subject: `2FA Verification Code - ${env.APP_NAME}`,
            html: `<p>Your 2FA security code is: <b>${otp}</b>. Do not share this code with anyone.</p>`,
          });
        }
      }
    }),
    sveltekitCookies(getRequestEvent)
  ]
});

export type AuthType = typeof auth;
export type Session = AuthType['$Infer']['Session'];
export type AuthUser = Session['user'];
export type AuthSession = Session['session'];
export type Role = typeof schema.userRoleEnum.enumValues[number];
export const userRoleEnum = schema.userRoleEnum;
