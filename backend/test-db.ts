import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './src/db/schema';

const connectionString = "postgresql://postgres:uAF%2C53DcmvUH%25%2C!@db.bdhtkjwldpmugmxewxsz.supabase.co:5432/postgres";

async function main() {
  console.log("Connecting with pg Pool...");
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  
  try {
    const users = await db.select().from(schema.users).limit(1);
    console.log("Users:", users);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

main();
