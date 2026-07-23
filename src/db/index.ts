import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import 'dotenv/config';

// To avoid crashing if run on the client or during build without env variables
function getConnectionString() {
  let dbUrl = process.env.DATABASE_URL;
  let dbHost = process.env.DATABASE_HOST;
  const isProd = process.env.NODE_ENV === 'production';

  if (dbUrl?.startsWith('mysql')) {
    if (isProd && dbUrl.includes('@45.43.152.5')) {
      dbUrl = dbUrl.replace('@45.43.152.5', '@127.0.0.1');
    }
    return dbUrl;
  }

  const { DATABASE_NAME, DATABASE_PASSWORD, DATABASE_PORT, DATABASE_USER } = process.env;
  if (!dbHost || !DATABASE_NAME || !DATABASE_USER) {
    return '';
  }

  if (isProd && (dbHost === '45.43.152.5' || dbHost === 'localhost')) {
    dbHost = '127.0.0.1';
  }

  const password = DATABASE_PASSWORD ? `:${encodeURIComponent(DATABASE_PASSWORD)}` : '';
  const port = DATABASE_PORT || '3306';
  return `mysql://${encodeURIComponent(DATABASE_USER)}${password}@${dbHost}:${port}/${DATABASE_NAME}?connectTimeout=10000`;
}

const connectionString = getConnectionString();

if (!connectionString) {
  throw new Error('DATABASE_URL is required for database connection');
}

const poolConnection = mysql.createPool({ 
  uri: connectionString,
  waitForConnections: true,
  connectionLimit: 25,
  maxIdle: 25,
  idleTimeout: 30000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

export const db = drizzle(poolConnection, { schema, mode: 'default' });
