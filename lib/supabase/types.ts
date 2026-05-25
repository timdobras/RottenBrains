import type { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/database.types';

/**
 * The concrete Supabase client type as produced by `@supabase/ssr`, bound to
 * our generated `Database` schema.
 *
 * Derived from the factory's return type (rather than importing `SupabaseClient`
 * from `@supabase/supabase-js` directly) so it stays in lockstep with whatever
 * supabase-js version `@supabase/ssr` resolves to — importing it directly caused
 * a generic-arity mismatch between the two packages.
 */
export type TypedSupabaseClient = ReturnType<typeof createBrowserClient<Database>>;
