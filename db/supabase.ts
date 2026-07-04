import { createClient } from '@supabase/supabase-js';

// Get the URL from standard environment variables (usually postgres string can be used to derive, but Supabase gives NEXT_PUBLIC_SUPABASE_URL)
// Wait, the user didn't have NEXT_PUBLIC_SUPABASE_URL in their original .env for Cloudflare!
// Let me use a hardcoded value if process.env is missing, or ask them to add it.
// The user provided earlier:
// https://bdhtkjwldpmugmxewxsz.supabase.co
// sb_publishable_10DBXa1ZqXnc715p3qo39Q_8K3kGn3Z

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bdhtkjwldpmugmxewxsz.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_10DBXa1ZqXnc715p3qo39Q_8K3kGn3Z';

// We use the REST API here so it is compatible with the Edge Runtime
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  }
});
