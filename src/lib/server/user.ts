import type { RequestEvent } from '@sveltejs/kit';
import { and, asc, count, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { db } from '$lib/server/db';
import { permission, role, rolePermissions, session, user } from '$lib/server/db/schema';
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

const USER_PAGE_SIZES = new Set([10, 20, 50]);

export async function listManagedUsers(filters: {
	query?: string;
	role?: string;
	status?: string;
	page?: number;
	pageSize?: number;
}) {
	const pageSize = USER_PAGE_SIZES.has(Number(filters.pageSize)) ? Number(filters.pageSize) : 20;
	const page = Math.max(1, Number(filters.page) || 1);
	const conditions = [];
	const query = filters.query?.trim();
	if (query) {
		conditions.push(
			or(
				ilike(user.name, `%${query}%`),
				ilike(user.email, `%${query}%`),
				ilike(user.username, `%${query}%`)
			)!
		);
	}
	if (['user', 'moderator', 'superadmin'].includes(filters.role ?? '')) {
		conditions.push(eq(user.role, filters.role as 'user' | 'moderator' | 'superadmin'));
	}
	if (['active', 'inactive', 'banned'].includes(filters.status ?? '')) {
		conditions.push(eq(user.status, filters.status as 'active' | 'inactive' | 'banned'));
	}
	const where = conditions.length ? and(...conditions) : undefined;
	const [{ total }] = await db.select({ total: count() }).from(user).where(where);
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const currentPage = Math.min(page, totalPages);
	const items = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			username: user.username,
			image: user.image,
			role: user.role,
			status: user.status,
			banned: user.banned,
			banReason: user.banReason,
			emailVerified: user.emailVerified,
			twoFactorEnabled: user.twoFactorEnabled,
			lastLoginAt: user.lastLoginAt,
			createdAt: user.createdAt
		})
		.from(user)
		.where(where)
		.orderBy(desc(user.createdAt))
		.limit(pageSize)
		.offset((currentPage - 1) * pageSize);
	return { items, total, page: currentPage, pageSize, totalPages };
}

export async function getManagedUser(id: string) {
	const account = await db.query.user.findFirst({ where: eq(user.id, id) });
	if (!account) return null;
	const [allPermissions, assigned] = await Promise.all([
		db.select().from(permission).orderBy(asc(permission.code)),
		db
			.select({ id: permission.id, code: permission.code })
			.from(rolePermissions)
			.innerJoin(permission, eq(permission.id, rolePermissions.permissionId))
			.where(eq(rolePermissions.userId, id))
	]);
	return { account, allPermissions, assignedPermissions: assigned };
}

export async function changeUserRole(id: string, nextRole: 'user' | 'moderator' | 'superadmin') {
	const target = await db.query.user.findFirst({ where: eq(user.id, id) });
	if (!target) return { ok: false as const, reason: 'not_found' as const };
	if (target.role === 'superadmin' && nextRole !== 'superadmin') {
		const [{ total }] = await db
			.select({ total: count() })
			.from(user)
			.where(eq(user.role, 'superadmin'));
		if (total <= 1) return { ok: false as const, reason: 'last_superadmin' as const };
	}
	const roleRow = await db.query.role.findFirst({ where: eq(role.name, nextRole) });
	await db.batch([
		db.update(user).set({ role: nextRole, updatedAt: new Date() }).where(eq(user.id, id)),
		...(roleRow
			? [
					db
						.update(rolePermissions)
						.set({ roleId: roleRow.id, updatedAt: new Date() })
						.where(eq(rolePermissions.userId, id))
				]
			: [])
	] as Parameters<typeof db.batch>[0]);
	return { ok: true as const, previousRole: target.role };
}

export async function setUserBan(id: string, banned: boolean, reason?: string) {
	const target = await db.query.user.findFirst({ where: eq(user.id, id) });
	if (!target) return null;
	await db.batch([
		db
			.update(user)
			.set({
				banned,
				status: banned ? 'banned' : 'active',
				banReason: banned ? reason?.trim() || 'Administrative action' : null,
				banExpires: null,
				updatedAt: new Date()
			})
			.where(eq(user.id, id)),
		...(banned ? [db.delete(session).where(eq(session.userId, id))] : [])
	] as Parameters<typeof db.batch>[0]);
	return target;
}

export async function assignUserPermissions(id: string, permissionIds: string[]) {
	const uniqueIds = [...new Set(permissionIds)];
	const [target, validPermissions] = await Promise.all([
		db.query.user.findFirst({ where: eq(user.id, id) }),
		uniqueIds.length
			? db.select({ id: permission.id }).from(permission).where(inArray(permission.id, uniqueIds))
			: Promise.resolve([])
	]);
	if (!target) return null;
	const roleRow = await db.query.role.findFirst({ where: eq(role.name, target.role) });
	if (!roleRow) throw new Error(`Role configuration not found for ${target.role}`);
	const statements: BatchItem<'pg'>[] = [
		db.delete(rolePermissions).where(eq(rolePermissions.userId, id))
	];
	if (validPermissions.length) {
		statements.push(
			db.insert(rolePermissions).values(
				validPermissions.map((item) => ({
					userId: id,
					roleId: roleRow.id,
					permissionId: item.id
				}))
			)
		);
	}
	await db.batch(statements as [BatchItem<'pg'>, ...BatchItem<'pg'>[]]);
	return { assigned: validPermissions.length };
}
