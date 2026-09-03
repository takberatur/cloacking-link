import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { inArray, sql } from 'drizzle-orm';
import * as schema from './schema';
import type { PlatformSettingsInput } from '@/utils/validators.js';

const DEFAULTS: PlatformSettingsInput = {
	site_name: 'Link Shift',
	site_tagline: 'Multi-URL cloaking & rotating',
	site_logo: '/logo.png',
	site_favicon: '/favicon.ico',
	site_meta_title: 'Link Shift',
	site_meta_description:
		'Cloak and rotate links across multiple destinations, block unwanted traffic by IP, domain, or device, and control every redirect — free.',
	site_og_image: '/logo.png',
	site_og_title: 'LinkShift — Multi-URL cloaking & rotating redirects, free',
	site_og_description:
		'Cloak and rotate links across multiple destinations, block unwanted traffic by IP, domain, or device, and control every redirect — free.',
	site_url: 'https://links-shift.vercel.app/',
	site_keywords: 'link cloaking, link rotation, link protection, link privacy, link security',
	enable_register: false
};

async function main() {
	console.log('🚀 Initialize db...');
	if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
	const client = neon(process.env.DATABASE_URL);
	const db = drizzle(client, { schema });
	console.log('✅ Successfully connected to the database.');

	console.log('⏳ Starting the database seeding process...');

	console.log('👥 Adding Roles data...');
	const insertedRoles = await db
		.insert(schema.role)
		.values([
			{ name: 'superadmin', level: 2 },
			{ name: 'moderator', level: 1 },
			{ name: 'user', level: 0 }
		])
		.onConflictDoUpdate({
			target: schema.role.name,
			set: { level: schema.role.level, updatedAt: new Date() }
		})
		.returning({ id: schema.role.id, name: schema.role.name });

	const roleMap = Object.fromEntries(insertedRoles.map((r) => [r.name, r.id]));
	console.log('✅ Roles data added successfully!');

	console.log('🔑 Adding Permissions data...');
	const insertedPermissions = await db
		.insert(schema.permission)
		.values([
			{ code: 'user:read', description: 'View user data' },
			{ code: 'user:write', description: 'Create or edit user data' },
			{ code: 'user:delete', description: 'Delete user data' },
			{ code: 'system:settings', description: 'Change system settings' },
			{ code: 'campaign:read', description: 'View owned campaigns and destinations' },
			{ code: 'campaign:create', description: 'Create campaigns and destinations' },
			{ code: 'campaign:update', description: 'Edit campaigns and destinations' },
			{ code: 'campaign:delete', description: 'Delete campaigns and destinations' },
			{ code: 'analytics:read', description: 'View campaign and visitor analytics' },
			{ code: 'rules:manage', description: 'Manage traffic targeting and block rules' },
			{ code: 'safelink:manage', description: 'Create and publish safelink pages' },
			{ code: 'api-key:manage', description: 'Create and revoke API keys' }
		])
		.onConflictDoUpdate({
			target: schema.permission.code,
			set: { description: sql`excluded.description`, updatedAt: new Date() }
		})
		.returning({ id: schema.permission.id, code: schema.permission.code });

	const permMap = Object.fromEntries(insertedPermissions.map((p) => [p.code, p.id]));
	console.log('✅ Permissions data added successfully!');

	// console.log('👤 Adding Superadmin Users data...');
	// const insertedUsers = await db.insert(schema.user).values([
	//   {
	//     name: 'Super Admin',
	//     username: 'superadmin',
	//     email: 'superadmin@linkshift.com',
	//     password: '1234567890',
	//     role: 'superadmin',
	//     emailVerified: true,
	//     status: 'active'
	//   },
	//   {
	//     name: 'Moderator Dummy',
	//     username: 'moderator',
	//     email: 'moderator@linkshift.com',
	//     password: '1234567890',
	//     role: 'moderator',
	//     emailVerified: true,
	//     status: 'active'
	//   },
	//   {
	//     name: 'Regular User Dummy',
	//     username: 'regularuser',
	//     email: 'user@linkshift.com',
	//     password: '1234567890',
	//     role: 'user',
	//     emailVerified: true,
	//     status: 'active'
	//   },
	// ])
	//   .onConflictDoUpdate({
	//     target: schema.user.email,
	//     set: { name: schema.user.name, username: schema.user.username, role: schema.user.role, updatedAt: new Date() }
	//   })
	//   .returning({ id: schema.user.id, role: schema.user.role });

	// const userMap = Object.fromEntries(insertedUsers.map(u => [u.role, u.id]));
	// console.log('✅ Superadmin Users data added successfully!');

	// console.log('🔗 Connecting Users, Roles, and Permissions...');
	// const userIds = Object.values(userMap);
	// if (userIds.length > 0) {
	//   await db.delete(schema.rolePermissions).where(
	//     inArray(schema.rolePermissions.userId, userIds)
	//   );
	// }
	// await db.insert(schema.rolePermissions).values([
	//   {
	//     userId: userMap['superadmin'],
	//     roleId: roleMap['superadmin'],
	//     permissionId: permMap['system:settings']
	//   },
	//   {
	//     userId: userMap['superadmin'],
	//     roleId: roleMap['superadmin'],
	//     permissionId: permMap['user:delete']
	//   },
	//   {
	//     userId: userMap['moderator'],
	//     roleId: roleMap['moderator'],
	//     permissionId: permMap['user:write']
	//   },
	//   {
	//     userId: userMap['moderator'],
	//     roleId: roleMap['moderator'],
	//     permissionId: permMap['user:read']
	//   },
	//   {
	//     userId: userMap['user'],
	//     roleId: roleMap['user'],
	//     permissionId: permMap['user:read']
	//   }
	// ])
	// console.log('✅ Users, Roles, and Permissions connected successfully!');

	console.log('⚒️ Adding Default Settings data...');
	const settingPromises = Object.entries(DEFAULTS).map(([key, value]) =>
		db
			?.insert(schema.settings)
			.values({ key, value })
			.onConflictDoUpdate({
				target: schema.settings.key,
				set: { value, updatedAt: new Date() }
			})
	);
	await Promise.all(settingPromises);
	console.log('✅ Default Settings data added successfully!');

	console.log('✅ Database seeding process completed successfully!');
}

main().catch((err) => {
	console.error('❌ Seeding failed:', err);
	process.exit(1);
});
