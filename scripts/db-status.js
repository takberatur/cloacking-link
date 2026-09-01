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
      'api_keys',
      'settings',
      '__drizzle_migrations'
    )
  order by table_schema, table_name
`);

const columns = await sql.query(`
  select table_name, column_name, data_type, udt_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name in ('user', 'session', 'account', 'role_permissions')
    and column_name in ('id', 'user_id', 'role')
  order by table_name, ordinal_position
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

console.log(JSON.stringify({ tables, columns, migrations, triggers, routines }, null, 2));
