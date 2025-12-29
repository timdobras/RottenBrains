import { createBrowserClient } from '@supabase/ssr';
import { isOfflineMode } from '@/lib/mocks/config';
import { createMockBrowserClient } from '@/lib/mocks/supabase';

export function createClient() {
  // Return mock client in offline mode
  if (isOfflineMode()) {
    return createMockBrowserClient();
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
