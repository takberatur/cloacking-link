import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { config } from 'dotenv';

config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const sql = neon(databaseUrl);
const db = drizzle(sql);

try {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Database migrations applied successfully.');
} catch (error) {
  console.error('Database migration failed.');

  if (error && typeof error === 'object') {
    const dbError = error;
    console.error({
      message: dbError.message,
      cause: dbError.cause?.message,
      causeCode: dbError.cause?.code,
      causeDetail: dbError.cause?.detail,
      causeHint: dbError.cause?.hint,
      causeTable: dbError.cause?.table,
      causeColumn: dbError.cause?.column,
      causeConstraint: dbError.cause?.constraint,
      code: dbError.code,
      detail: dbError.detail,
      hint: dbError.hint,
      table: dbError.table,
      column: dbError.column,
      constraint: dbError.constraint
    });
  } else {
    console.error(error);
  }

  process.exit(1);
}
