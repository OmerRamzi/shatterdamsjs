import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let dbCache: ReturnType<typeof drizzle> | null = null;
let clientCache: ReturnType<typeof postgres> | null = null;

export function getDb(connectionString: string) {
  if (!dbCache || !clientCache) {
    clientCache = postgres(connectionString, { prepare: false });
    dbCache = drizzle(clientCache, { schema });
  }
  return dbCache;
}
