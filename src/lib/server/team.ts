import { and, asc, eq, inArray, or, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { db } from '$lib/server/db';
import { campaigns, teamMembers, teams, user } from '$lib/server/db/schema';

const WRITABLE_TEAM_ROLES = ['owner', 'admin', 'member'] as const;

export function campaignAccess(userId: string, write = false) {
	const memberships = db
		.select({ teamId: teamMembers.teamId })
		.from(teamMembers)
		.where(
			and(
				eq(teamMembers.userId, userId),
				...(write ? [inArray(teamMembers.role, [...WRITABLE_TEAM_ROLES])] : [])
			)
		);
	return or(eq(campaigns.ownerId, userId), inArray(campaigns.teamId, memberships))!;
}

export async function listUserTeams(userId: string) {
	return db
		.select({
			id: teams.id,
			name: teams.name,
			slug: teams.slug,
			ownerId: teams.ownerId,
			role: teamMembers.role,
			createdAt: teams.createdAt,
			memberCount: sql<number>`(select count(*)::int from ${teamMembers} tm where tm.team_id = ${teams.id})`,
			campaignCount: sql<number>`(select count(*)::int from ${campaigns} c where c.team_id = ${teams.id})`
		})
		.from(teamMembers)
		.innerJoin(teams, eq(teams.id, teamMembers.teamId))
		.where(eq(teamMembers.userId, userId))
		.orderBy(asc(teams.name));
}

export async function listWritableTeams(userId: string) {
	return db
		.select({ id: teams.id, name: teams.name, role: teamMembers.role })
		.from(teamMembers)
		.innerJoin(teams, eq(teams.id, teamMembers.teamId))
		.where(and(eq(teamMembers.userId, userId), inArray(teamMembers.role, [...WRITABLE_TEAM_ROLES])))
		.orderBy(asc(teams.name));
}

export async function createTeam(ownerId: string, name: string) {
	const normalized = name
		.trim()
		.replace(/[^a-z0-9]+/gi, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase();
	const id = crypto.randomUUID();
	const slug = `${normalized || 'team'}-${id.slice(0, 8)}`;
	await db.batch([
		db.insert(teams).values({ id, ownerId, name: name.trim(), slug }),
		db.insert(teamMembers).values({ teamId: id, userId: ownerId, role: 'owner' })
	] as [BatchItem<'pg'>, ...BatchItem<'pg'>[]]);
	return { id, slug };
}

export async function getTeamForMember(userId: string, teamId: string) {
	const membership = await db.query.teamMembers.findFirst({
		where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
	});
	if (!membership) return null;
	const team = await db.query.teams.findFirst({
		where: eq(teams.id, teamId),
		with: {
			members: {
				orderBy: [asc(teamMembers.createdAt)],
				with: { user: true }
			},
			campaigns: { orderBy: (campaign, { desc }) => [desc(campaign.updatedAt)] }
		}
	});
	return team ? { team, membership } : null;
}

async function teamManager(userId: string, teamId: string) {
	return db.query.teamMembers.findFirst({
		where: and(
			eq(teamMembers.teamId, teamId),
			eq(teamMembers.userId, userId),
			inArray(teamMembers.role, ['owner', 'admin'])
		)
	});
}

export async function addTeamMember(
	actorId: string,
	teamId: string,
	email: string,
	memberRole: 'admin' | 'member' | 'viewer'
) {
	if (!(await teamManager(actorId, teamId)))
		return { ok: false as const, reason: 'forbidden' as const };
	const target = await db.query.user.findFirst({
		where: eq(user.email, email.trim().toLowerCase())
	});
	if (!target) return { ok: false as const, reason: 'not_found' as const };
	await db
		.insert(teamMembers)
		.values({ teamId, userId: target.id, role: memberRole })
		.onConflictDoUpdate({
			target: [teamMembers.teamId, teamMembers.userId],
			set: { role: memberRole, updatedAt: new Date() }
		});
	return { ok: true as const, userId: target.id };
}

export async function updateTeamMember(
	actorId: string,
	teamId: string,
	memberId: string,
	memberRole: 'admin' | 'member' | 'viewer'
) {
	if (!(await teamManager(actorId, teamId))) return false;
	const updated = await db
		.update(teamMembers)
		.set({ role: memberRole, updatedAt: new Date() })
		.where(
			and(
				eq(teamMembers.id, memberId),
				eq(teamMembers.teamId, teamId),
				inArray(teamMembers.role, ['admin', 'member', 'viewer'])
			)
		)
		.returning({ id: teamMembers.id });
	return updated.length > 0;
}

export async function removeTeamMember(actorId: string, teamId: string, memberId: string) {
	if (!(await teamManager(actorId, teamId))) return false;
	const removed = await db
		.delete(teamMembers)
		.where(
			and(
				eq(teamMembers.id, memberId),
				eq(teamMembers.teamId, teamId),
				inArray(teamMembers.role, ['admin', 'member', 'viewer'])
			)
		)
		.returning({ id: teamMembers.id });
	return removed.length > 0;
}
