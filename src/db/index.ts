import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import 'dotenv/config';

// To avoid crashing if run on the client or during build without env variables
let connectionString = '';
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql')) {
  connectionString = process.env.DATABASE_URL;
}

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
