import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import 'dotenv/config';

// To avoid crashing if run on the client or during build without env variables
function getConnectionString() {
  if (process.env.DATABASE_URL?.startsWith('mysql')) {
    return process.env.DATABASE_URL;
  }

  const { DATABASE_HOST, DATABASE_NAME, DATABASE_PASSWORD, DATABASE_PORT, DATABASE_USER } = process.env;
  if (!DATABASE_HOST || !DATABASE_NAME || !DATABASE_USER) {
    return '';
  }

  const password = DATABASE_PASSWORD ? `:${encodeURIComponent(DATABASE_PASSWORD)}` : '';
  const port = DATABASE_PORT || '3306';
  return `mysql://${encodeURIComponent(DATABASE_USER)}${password}@${DATABASE_HOST}:${port}/${DATABASE_NAME}?connectTimeout=10000`;
}

const connectionString = getConnectionString();

if (!connectionString) {
  throw new Error('DATABASE_URL is required for database connection');
}

const poolConnection = mysql.createPool({ 
  uri: connectionString,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

export const db = drizzle(poolConnection, { schema, mode: 'default' });
