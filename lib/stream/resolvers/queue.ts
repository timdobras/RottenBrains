import { Queue, QueueEvents } from 'bullmq';

import { logger } from '@/lib/logger';

import type { ExtractedStream, ResolveParams, StreamResolver } from '../types';

/**
 * Resolves streams by enqueueing a job onto the shared `stream-extract` queue
 * and awaiting the result. The rb-extractor worker (headless Chromium) does the
 * actual work. Communication is via the shared Redis (db-server), so there is
 * no app↔extractor HTTP/Docker-networking dependency.
 */

const QUEUE_NAME = process.env.STREAM_QUEUE || 'stream-extract';
const JOB_TIMEOUT_MS = Number(process.env.STREAM_JOB_TIMEOUT_MS || 60_000);

interface ExtractResult {
  url?: string;
  headers?: Record<string, string>;
  subtitles?: ExtractedStream['subtitles'];
  resolver?: string;
}

// Long-lived singletons (the Next server is a persistent process). QueueEvents
// needs its own connection, separate from the Queue's.
let queue: Queue | null = null;
let events: QueueEvents | null = null;

// Parse REDIS_URL into connection options so BullMQ uses its OWN bundled
// ioredis (passing our ioredis instance causes a dual-version type clash).
function redisConnection() {
  const u = new URL(process.env.REDIS_URL as string);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username || undefined,
    password: u.password || undefined,
    db: u.pathname.length > 1 ? Number(u.pathname.slice(1)) : 0,
    maxRetriesPerRequest: null,
  };
}

function ensure(): { queue: Queue; events: QueueEvents } | null {
  if (!process.env.REDIS_URL) return null;
  if (!queue || !events) {
    queue = new Queue(QUEUE_NAME, { connection: redisConnection() });
    events = new QueueEvents(QUEUE_NAME, { connection: redisConnection() });
  }
  return { queue, events };
}

export function queueResolver(): StreamResolver | null {
  if (!process.env.REDIS_URL) return null;
  return {
    name: 'queue',
    async resolve(params: ResolveParams): Promise<ExtractedStream | null> {
      const q = ensure();
      if (!q) return null;
      try {
        const job = await q.queue.add(
          'extract',
          {
            type: params.media_type,
            id: params.media_id,
            season: params.season_number,
            episode: params.episode_number,
          },
          { removeOnComplete: 200, removeOnFail: 100 },
        );
        const result = (await job.waitUntilFinished(q.events, JOB_TIMEOUT_MS)) as ExtractResult;
        if (!result?.url) return null;
        return {
          url: result.url,
          headers: result.headers ?? {},
          subtitles: result.subtitles ?? [],
          resolver: result.resolver ?? 'queue',
          type: 'hls',
        };
      } catch (err) {
        // Worker throws "no_source" when nothing resolves — expected, fall through.
        logger.warn('queue resolver: no result', { err: String(err) });
        return null;
      }
    },
  };
}
