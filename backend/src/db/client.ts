import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

let dbCache: ReturnType<typeof drizzle> | null = null;
let poolCache: Pool | null = null;

export function getDb(env: any) {
  if (!dbCache || !poolCache) {
    const connString = env?.HYPERDRIVE?.connectionString || env.DATABASE_URL;
    poolCache = new Pool({ connectionString: connString });
    dbCache = drizzle(poolCache, { schema });
  }
  return dbCache;
}
