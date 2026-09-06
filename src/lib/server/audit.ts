import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditLogs, user } from '$lib/server/db/schema';

export type AuditInput = {
	actorId?: string | null;
	action: string;
	targetType?: string | null;
	targetId?: string | null;
	meta?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditInput): Promise<void> {
	await db.insert(auditLogs).values({
		actorId: input.actorId ?? null,
		action: input.action,
		targetType: input.targetType ?? null,
		targetId: input.targetId ?? null,
		meta: input.meta ?? {}
	});
}

export async function listAuditLogs(filters: {
	query?: string;
	action?: string;
	page?: number;
	pageSize?: number;
}) {
	const pageSize = [20, 50, 100].includes(Number(filters.pageSize)) ? Number(filters.pageSize) : 20;
	const page = Math.max(1, Number(filters.page) || 1);
	const conditions = [];
	const query = filters.query?.trim();
	if (query) {
		conditions.push(
			or(
				ilike(auditLogs.action, `%${query}%`),
				ilike(auditLogs.targetType, `%${query}%`),
				ilike(auditLogs.targetId, `%${query}%`),
				ilike(user.email, `%${query}%`),
				ilike(user.name, `%${query}%`)
			)!
		);
	}
	if (filters.action?.trim()) conditions.push(eq(auditLogs.action, filters.action.trim()));
	const where = conditions.length ? and(...conditions) : undefined;

	const [{ total }] = await db
		.select({ total: count() })
		.from(auditLogs)
		.leftJoin(user, eq(user.id, auditLogs.actorId))
		.where(where);
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const currentPage = Math.min(page, totalPages);
	const items = await db
		.select({
			id: auditLogs.id,
			action: auditLogs.action,
			targetType: auditLogs.targetType,
			targetId: auditLogs.targetId,
			meta: auditLogs.meta,
			createdAt: auditLogs.createdAt,
			actorId: auditLogs.actorId,
			actorName: user.name,
			actorEmail: user.email
		})
		.from(auditLogs)
		.leftJoin(user, eq(user.id, auditLogs.actorId))
		.where(where)
		.orderBy(desc(auditLogs.createdAt))
		.limit(pageSize)
		.offset((currentPage - 1) * pageSize);

	return { items, total, page: currentPage, pageSize, totalPages };
}
