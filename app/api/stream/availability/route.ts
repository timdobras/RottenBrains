import { NextRequest, NextResponse } from 'next/server';

import { publicProviderName } from '@/lib/stream/providerNames';
import { availabilityKey, streamRedis } from '@/lib/stream/redis';

export const dynamic = 'force-dynamic';

export interface AvailabilityEntry {
  provider: string;
  ok: boolean;
  type: 'hls' | 'mp4' | null;
  subtitleCount: number;
  languages: string[];
  /** when this entry was last resolved (epoch ms) */
  at: number;
}

/**
 * Cached provider availability for a title (populated by the rb-extractor worker
 * as it resolves). Lets the client instantly show which sources work — and skip
 * re-probing known-bad ones — for anything a previous user already watched.
 * Falls back to an empty list (→ full live probe) on a cache miss or no Redis.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const media_type = searchParams.get('media_type');
  const media_id = searchParams.get('media_id');
  if (media_type !== 'movie' && media_type !== 'tv') {
    return NextResponse.json({ error: 'media_type must be movie|tv' }, { status: 400 });
  }
  if (!media_id) {
    return NextResponse.json({ error: 'media_id required' }, { status: 400 });
  }

  const redis = streamRedis();
  if (!redis) return NextResponse.json({ providers: [], cached: false });

  const key = availabilityKey({
    media_type,
    media_id,
    season_number: searchParams.get('season_number') ?? undefined,
    episode_number: searchParams.get('episode_number') ?? undefined,
  });

  let hash: Record<string, string> = {};
  try {
    hash = await redis.hgetall(key);
  } catch {
    return NextResponse.json({ providers: [], cached: false });
  }

  const providers: AvailabilityEntry[] = [];
  for (const [provider, raw] of Object.entries(hash)) {
    try {
      const v = JSON.parse(raw);
      providers.push({
        // aliased in prod so the real provider name never reaches the client
        provider: publicProviderName(provider),
        ok: !!v.ok,
        type: v.type ?? null,
        subtitleCount: v.subs ?? 0,
        languages: Array.isArray(v.langs) ? v.langs : [],
        at: v.at ?? 0,
      });
    } catch {
      /* skip malformed entry */
    }
  }

  return NextResponse.json({ providers, cached: providers.length > 0 });
}
