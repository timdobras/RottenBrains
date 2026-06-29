import 'server-only';
import { prisma } from '@/lib/prisma';

/**
 * Call a Postgres function by name with named args — the replacement for
 * `supabase.rpc(fn, args)`. The DB functions ported from Supabase are
 * unchanged; this just swaps the transport (PostgREST → Prisma raw SQL).
 *
 * Postgres resolves overloaded/typed functions by argument type, and a bare
 * bound parameter arrives as `text` — so `fn("id" => $1)` fails resolution with
 * 42883. We therefore look up each function's declared argument types from the
 * catalog (cached per process) and cast every parameter to its target type:
 * `fn("id" => $1::uuid, "n" => $2::integer)`.
 *
 * `undefined`-valued args are omitted entirely so the function's own DEFAULT
 * applies (matching how supabase-js drops undefined keys). For `jsonb` args you
 * may pass a plain object/array (auto-serialised) or wrap with `jsonb(...)`.
 */
type JsonbArg = { readonly __jsonb: string };
export function jsonb(value: unknown): JsonbArg {
  return { __jsonb: JSON.stringify(value) };
}
function isJsonbArg(v: unknown): v is JsonbArg {
  return typeof v === 'object' && v !== null && '__jsonb' in v;
}

// proname -> list of overloads, each a map of in-arg name -> pg type string.
type ArgMap = Record<string, string>;
const sigCache = new Map<string, ArgMap[]>();
let sigLoaded = false;

async function loadSignatures(): Promise<void> {
  if (sigLoaded) return;
  try {
    const rows = await prisma.$queryRawUnsafe<
      { proname: string; proargnames: string[] | null; intypes: string[] }[]
    >(
      `SELECT p.proname, p.proargnames,
              array(SELECT format_type(t, NULL) FROM unnest(p.proargtypes) AS t) AS intypes
       FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.prokind = 'f'`
    );
    for (const r of rows) {
      const names = r.proargnames ?? [];
      const map: ArgMap = {};
      // The first proargtypes.length entries of proargnames are the IN args.
      for (let i = 0; i < r.intypes.length; i++) {
        if (names[i]) map[names[i]] = r.intypes[i];
      }
      const list = sigCache.get(r.proname) ?? [];
      list.push(map);
      sigCache.set(r.proname, list);
    }
    sigLoaded = true;
  } catch {
    // Degrade gracefully: without signatures we emit no casts (works for the
    // text-arg cases). Don't mark loaded so a later call can retry.
  }
}

/** Pick the overload whose arg set is the smallest superset of the given keys. */
function pickOverload(fn: string, keys: string[]): ArgMap | undefined {
  const overloads = sigCache.get(fn);
  if (!overloads) return undefined;
  const candidates = overloads
    .filter((o) => keys.every((k) => k in o))
    .sort((a, b) => Object.keys(a).length - Object.keys(b).length);
  return candidates[0];
}

export async function rpc<T = Record<string, unknown>>(
  fn: string,
  args: Record<string, unknown> = {}
): Promise<T[]> {
  await loadSignatures();
  // Drop undefined args so the function's DEFAULT applies.
  const entries = Object.entries(args).filter(([, v]) => v !== undefined);
  const overload = pickOverload(
    fn,
    entries.map(([k]) => k)
  );

  const params: unknown[] = [];
  const placeholders = entries.map(([key, value]) => {
    let type = overload?.[key];
    let v = value;
    if (isJsonbArg(value)) {
      v = value.__jsonb;
      type = type ?? 'jsonb';
    } else if (type === 'jsonb' && value !== null && typeof value === 'object') {
      v = JSON.stringify(value);
    }
    params.push(v);
    return `"${key}" => $${params.length}${type ? `::${type}` : ''}`;
  });

  const sql = `SELECT * FROM "${fn}"(${placeholders.join(', ')})`;
  return prisma.$queryRawUnsafe<T[]>(sql, ...params);
}

/** Single-row helper for functions that return one row (or scalar). */
export async function rpcOne<T = Record<string, unknown>>(
  fn: string,
  args: Record<string, unknown> = {}
): Promise<T | null> {
  const rows = await rpc<T>(fn, args);
  return rows[0] ?? null;
}

/**
 * Recursively convert `bigint` (and Prisma `Decimal`-like) values to `number`
 * so results are JSON-serialisable across the server/client boundary. Lossy
 * above 2^53 — fine for our counters.
 */
export function serializeRows<T>(rows: T): T {
  return JSON.parse(
    JSON.stringify(rows, (_k, v) => (typeof v === 'bigint' ? Number(v) : v))
  );
}
