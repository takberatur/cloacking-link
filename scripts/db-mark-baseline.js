import { neon } from '@neondatabase/serverless';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { config } from 'dotenv';

config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const [baseline] = readMigrationFiles({ migrationsFolder: './drizzle' });

if (!baseline) {
  throw new Error('No baseline migration found in ./drizzle');
}

const sql = neon(databaseUrl);

await sql.query('create schema if not exists "drizzle"');
await sql.query(`
  create table if not exists "drizzle"."__drizzle_migrations" (
    id serial primary key,
    hash text not null,
    created_at bigint
  )
`);

const existingRows = await sql.query(
  'select id from "drizzle"."__drizzle_migrations" where created_at = $1 limit 1',
  [baseline.folderMillis]
);

if (existingRows.length === 0) {
  await sql.query(
    'insert into "drizzle"."__drizzle_migrations" ("hash", "created_at") values ($1, $2)',
    [baseline.hash, baseline.folderMillis]
  );
  console.log(`Marked baseline migration as applied: ${baseline.folderMillis}`);
} else {
  console.log(`Baseline migration already marked: ${baseline.folderMillis}`);
}
