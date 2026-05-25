import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/database.types';
import { isOfflineMode } from '@/lib/mocks/config';
import { createMockBrowserClient } from '@/lib/mocks/supabase';
import type { TypedSupabaseClient } from './types';

export function createClient(): TypedSupabaseClient {
  // Return mock client in offline mode
  if (isOfflineMode()) {
    return createMockBrowserClient();
  }

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
