/**
 * Supabase service role client
 *
 * Uses the SUPABASE_SERVICE_ROLE_KEY to bypass RLS.
 * ONLY use this for server-side operations that need elevated access,
 * such as webhook processing where no user session is available.
 *
 * Never expose this client to the browser.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/database.types';

export function createServiceClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
