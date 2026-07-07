import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

function getDatabaseUrl() {
  if (process.env.DATABASE_URL?.startsWith('mysql')) {
    return process.env.DATABASE_URL;
  }

  const { DATABASE_HOST, DATABASE_NAME, DATABASE_PASSWORD, DATABASE_PORT, DATABASE_USER } = process.env;
  if (!DATABASE_HOST || !DATABASE_NAME || !DATABASE_USER) {
    return '';
  }

  const password = DATABASE_PASSWORD ? `:${encodeURIComponent(DATABASE_PASSWORD)}` : '';
  const port = DATABASE_PORT || '3306';
  return `mysql://${encodeURIComponent(DATABASE_USER)}${password}@${DATABASE_HOST}:${port}/${DATABASE_NAME}`;
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
