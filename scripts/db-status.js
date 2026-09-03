import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error('DATABASE_URL is not set');
}

const sql = neon(databaseUrl);

const tables = await sql.query(`
  select table_schema, table_name
  from information_schema.tables
  where table_schema in ('public', 'drizzle')
    and table_name in (
      'user',
      'session',
      'account',
      'verification',
      'role',
      'permissions',
      'role_permissions',
      'two_factor',
      'api_keys',
      'settings',
	  'campaigns',
	  'destinations',
	  'destination_geo_targets',
	  'destination_deep_links',
	  'block_rules',
	  'visitors',
	  'click_events',
	  'safelink_pages',
	  'popunder_settings',
      '__drizzle_migrations'
    )
  order by table_schema, table_name
`);

const columns = await sql.query(`
  select table_name, column_name, data_type, udt_name, is_nullable
  from information_schema.columns
  where table_schema = 'public'
    and table_name in ('user', 'session', 'account', 'role_permissions', 'two_factor')
    and column_name in (
      'id',
      'user_id',
      'role',
      'username',
      'display_username',
      'banned',
      'ban_reason',
      'ban_expires',
      'two_factor_enabled',
      'two_factor_secret',
      'secret',
      'backup_codes',
      'verified',
      'failed_verification_count',
      'locked_until'
    )
  order by table_name, ordinal_position
`);

const userPasswordColumns = await sql.query(`
  select table_name, column_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'user'
    and column_name = 'password'
`);

const migrations = await sql.query(`
  select id, created_at
  from drizzle.__drizzle_migrations
  order by created_at
`);

const triggers = await sql.query(`
  select trigger_name, event_manipulation
  from information_schema.triggers
  where event_object_schema = 'public'
    and event_object_table = 'user'
    and trigger_name = 'trigger_sync_user_role'
  order by event_manipulation
`);

const routines = await sql.query(`
  select routine_name
  from information_schema.routines
  where specific_schema = 'public'
    and routine_name = 'sync_user_role_rbac'
`);

const domainForeignKeys = await sql.query(`
  select tc.table_name, tc.constraint_name
  from information_schema.table_constraints tc
  where tc.table_schema = 'public'
    and tc.constraint_type = 'FOREIGN KEY'
    and tc.table_name in (
      'campaigns',
      'destinations',
      'destination_geo_targets',
      'destination_deep_links',
      'block_rules',
      'visitors',
      'click_events',
      'safelink_pages',
      'popunder_settings'
    )
  order by tc.table_name, tc.constraint_name
`);

const domainPermissions = await sql.query(`
  select code
  from permissions
  where code in (
    'campaign:read',
    'campaign:create',
    'campaign:update',
    'campaign:delete',
    'analytics:read',
    'rules:manage',
    'safelink:manage',
    'api-key:manage'
  )
  order by code
`);

console.log(
	JSON.stringify(
		{
			tables,
			columns,
			userPasswordColumns,
			migrations,
			triggers,
			routines,
			domainForeignKeys,
			domainPermissions
		},
		null,
		2
	)
);
