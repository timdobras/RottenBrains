import IORedis from 'ioredis';

/**
 * Singleton ioredis client for the Next server, used to read the rb-extractor
 * worker's shared caches (currently provider availability). The Next process is
 * long-lived, so we keep one connection. Returns null when REDIS_URL is unset
 * (callers degrade to live probing).
 */
let client: IORedis | null = null;

export function streamRedis(): IORedis | null {
  if (!process.env.REDIS_URL) return null;
  if (!client) {
    client = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: true,
    });
    // Don't let a transient Redis blip crash the server; reads handle their own errors.
    client.on('error', () => {});
  }
  return client;
}

/** Must match `availKey` in rb-extractor/worker.mjs exactly. */
export function availabilityKey(p: {
  media_type: string;
  media_id: string;
  season_number?: string;
  episode_number?: string;
}): string {
  return `rb-extractor:avail:${p.media_type}:${p.media_id}:${p.season_number || ''}:${p.episode_number || ''}`;
}
