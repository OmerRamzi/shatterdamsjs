import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables (mostly for DATABASE_URL if pushing directly)
dotenv.config();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
});
