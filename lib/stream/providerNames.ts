/**
 * Public-facing provider aliases.
 *
 * Real provider names (vidlink.pro, spencerdevs, …) are an internal detail. In
 * production we never expose them to the client — each is bound to a stable,
 * made-up codename here and the API translates at the boundary. In development
 * the real names are used as-is (the dev page can preview the aliases via a
 * client-side toggle).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTRACT — do not break (aliases are a permanent public identity):
 *   1. An alias, once assigned, NEVER changes.
 *   2. An alias is NEVER reused for a different provider — even after the
 *      original provider is removed. To retire a provider, KEEP its row here
 *      (its alias stays burned forever).
 *   3. A new provider gets a brand-new alias that has never appeared above.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const PROVIDER_ALIASES: Record<string, string> = {
  'vidlink.pro': 'Nova',
  spencerdevs: 'Comet',
  vidrock: 'Quasar',
  cinezo: 'Pulsar',
  Videasy: 'Orbit',
  SuperEmbed: 'Nebula',
  '2Embed': 'Cosmo',
  'VidSrc.cc': 'Meteor',
  'VidSrc.fyi': 'Aurora',
  // ── retired providers: keep their rows so the alias is never reused ──
  // (none yet)
};

// Dev-time guard: aliases must be unique (contract #2). A collision means a new
// row reused an existing alias — fix it before it ships.
if (process.env.NODE_ENV !== 'production') {
  const seen = new Map<string, string>();
  for (const [real, alias] of Object.entries(PROVIDER_ALIASES)) {
    const key = alias.toLowerCase();
    if (seen.has(key)) {
      throw new Error(
        `providerNames: alias "${alias}" assigned to both "${seen.get(key)}" and "${real}" — aliases must be unique and never reused.`,
      );
    }
    seen.set(key, real);
  }
}

const ALIAS_TO_REAL = new Map(
  Object.entries(PROVIDER_ALIASES).map(([real, alias]) => [alias.toLowerCase(), real]),
);

/** real internal name → its public alias (or the real name if none assigned). */
export function toAlias(real: string): string {
  return PROVIDER_ALIASES[real] ?? real;
}

/** public alias → real internal name (reverse of toAlias). */
export function toReal(pub: string): string {
  return ALIAS_TO_REAL.get(pub.toLowerCase()) ?? pub;
}

/**
 * Whether the API should hide real names behind aliases. On in production; off
 * in dev. Override with STREAM_ALIAS_PROVIDERS=1|0 (server-only) for testing.
 * Note: the dev page expects real names from the API, so do NOT force this on
 * while using the dev harness.
 */
export function aliasProvidersEnabled(): boolean {
  const flag = process.env.STREAM_ALIAS_PROVIDERS;
  if (flag === '1' || flag === 'true') return true;
  if (flag === '0' || flag === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

/** Apply aliasing at an outgoing API boundary (real → public when enabled). */
export function publicProviderName(real: string): string {
  return aliasProvidersEnabled() ? toAlias(real) : real;
}

/** Apply at an incoming API boundary (public → real when enabled). */
export function internalProviderName(pub: string): string {
  return aliasProvidersEnabled() ? toReal(pub) : pub;
}
