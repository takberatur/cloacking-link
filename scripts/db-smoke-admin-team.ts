import 'dotenv/config';
import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, eq } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema.ts';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
const db = drizzle(neon(process.env.DATABASE_URL), { schema });
const { auditLogs, teamMembers, teams, user } = schema;

const [owner] = await db.select({ id: user.id }).from(user).limit(1);
if (!owner) throw new Error('Create at least one user before running the admin/team smoke test');

const marker = `smoke-${crypto.randomUUID()}`;
let teamId: string | null = null;

try {
	const created = { id: crypto.randomUUID(), slug: marker };
	await db.batch([
		db
			.insert(teams)
			.values({
				id: created.id,
				ownerId: owner.id,
				name: `Smoke team ${marker.slice(-8)}`,
				slug: marker
			}),
		db.insert(teamMembers).values({ teamId: created.id, userId: owner.id, role: 'owner' })
	]);
	teamId = created.id;
	const memberships = await db
		.select({ id: teams.id, role: teamMembers.role })
		.from(teamMembers)
		.innerJoin(teams, eq(teams.id, teamMembers.teamId))
		.where(eq(teamMembers.userId, owner.id));
	assert.ok(memberships.some((item) => item.id === created.id && item.role === 'owner'));

	const detail = await db.query.teams.findFirst({
		where: eq(teams.id, created.id),
		with: { members: true }
	});
	assert.equal(detail?.id, created.id);
	assert.equal(detail?.members.length, 1);

	await db
		.insert(auditLogs)
		.values({
			actorId: owner.id,
			action: 'smoke.team_verified',
			targetType: 'team',
			targetId: created.id,
			meta: { marker }
		});
	const [audit] = await db
		.select({ id: auditLogs.id })
		.from(auditLogs)
		.where(and(eq(auditLogs.action, 'smoke.team_verified'), eq(auditLogs.targetId, created.id)))
		.limit(1);
	assert.ok(audit);

	console.log('Admin/team database smoke test passed', { teamId: created.id });
} finally {
	if (teamId) {
		await db
			.delete(auditLogs)
			.where(and(eq(auditLogs.action, 'smoke.team_verified'), eq(auditLogs.targetId, teamId)));
		await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
		await db.delete(teams).where(eq(teams.id, teamId));
	}
}
