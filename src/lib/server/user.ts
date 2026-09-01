import type { RequestEvent } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import { eq, and, or } from 'drizzle-orm';
import { user } from '$lib/server/db/schema';
import { ServerBase } from './server.js';

export class UserService extends ServerBase {
    constructor(protected readonly event: RequestEvent) {
        super(event);
    }
    async getUserById(id: string) {
        return await this.event.locals.db?.query.user.findFirst({ where: eq(user.id, id) });
    }
    async getUserByEmail(email: string) {
        return await this.event.locals.db?.query.user.findFirst({ where: eq(user.email, email) });
    }
    async updateAvatar(userId: string, avatar?: string | null): Promise<void | Error> {
        try {
            await this.event.locals.db?.update(user).set({ image: avatar }).where(eq(user.id, userId));
        } catch (error) {
            throw this.handleError(error);
        }
    }
}
