import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for serverless environment with proper error handling
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;

// Force the correct Neon database URL with real data
const CORRECT_DATABASE_URL = "postgresql://neondb_owner:npg_WvEZaIHiJ7j1@ep-falling-frost-a81spmxk-pooler.eastus2.azure.neon.tech/neondb?sslmode=require";

console.log('[DATABASE] Using correct Neon database with real data');
console.log('[DATABASE] Connection string:', CORRECT_DATABASE_URL.replace(/npg_[^@]+/, 'npg_****'));

// Create pool with optimized settings for better performance
export const pool = new Pool({ 
  connectionString: CORRECT_DATABASE_URL,
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