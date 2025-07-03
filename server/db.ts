import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for serverless environment with proper error handling
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with optimized settings for better performance
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 60000,
  max: 10,
  allowExitOnIdle: true,
  statement_timeout: 5000,
  query_timeout: 5000,
});

// Add error handling for pool connections
pool.on('error', (err) => {
  console.error('[DATABASE] Pool error:', err);
});

pool.on('connect', () => {
  console.log('[DATABASE] New connection established');
});

export const db = drizzle({ client: pool, schema });