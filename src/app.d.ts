import { db } from '@/server/db';
import type { AuthSession, AuthType, AuthUser } from '$lib/server/auth';
import type { RedisClient } from '$lib/server/redis';
import type { ServiceHelper } from '@/server/helper';
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    interface Locals {
      user?: AuthUser;
      session?: AuthSession;
      db: typeof db;
      auth?: AuthType;
      helper?: ServiceHelper;
      redis?: RedisClient;
      setting?: SiteSetting;
      safeGetSettings?: () => Promise<SiteSetting>;
    }

    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export { };
