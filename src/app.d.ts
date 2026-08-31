import type { User, Session } from 'better-auth';
import { db } from '@/server/db';
import type { AuthType, AuthUser } from '$lib/server/auth';
import type { RedisClient } from '$lib/server/redis';
import type { ServiceHelper } from '@/server/helper';
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    interface Locals {
      user?: User;
      session?: Session
      db: typeof db;
      redis: RedisClient;
      auth?: AuthType;
      redis?: RedisClient;
      helper?: ServiceHelper;
    }

    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export { };
