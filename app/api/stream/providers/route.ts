import IORedis from 'ioredis';
import { NextResponse } from 'next/server';

import { publicProviderName } from '@/lib/stream/providerNames';

export const dynamic = 'force-dynamic';

// Used if the worker status key isn't readable (Redis down / worker not booted).
const FALLBACK = ['vidlink.pro', 'spencerdevs', 'vidrock', 'Videasy', 'VidSrc.fyi', 'SuperEmbed', '2Embed', 'VidSrc.cc'];

// Reuse one connection across requests (and across hot-reloads in dev).
const g = globalThis as unknown as { __providerRedis?: IORedis };
function client(): IORedis | null {
  if (!process.env.REDIS_URL) return null;
  if (!g.__providerRedis) {
    g.__providerRedis = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false });
    g.__providerRedis.on('error', () => {});
  }
  return g.__providerRedis;
}

/**
 * GET /api/stream/providers
 * → { providers: string[], order: string[] | null }
 *   providers = everything the worker can resolve (for the picker)
 *   order     = the current Auto cascade order
 */
export async function GET() {
  let providers = FALLBACK;
  let order: string[] | null = null;
  try {
    const c = client();
    if (c) {
      const raw = await c.get('rb-extractor:status');
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s.availableProviders) && s.availableProviders.length) providers = s.availableProviders;
        if (Array.isArray(s.providers) && s.providers.length) order = s.providers;
      }
    }
  } catch {
    /* fall back to the constant list */
  }
  // In prod these are aliased so real provider names never reach the client.
  return NextResponse.json({
    providers: providers.map(publicProviderName),
    order: order ? order.map(publicProviderName) : null,
  });
}
