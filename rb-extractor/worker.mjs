import http from 'node:http';

import { Worker } from 'bullmq';
import IORedis from 'ioredis';

import { extractStream } from './lib.mjs';

// --- config ---
const QUEUE_NAME = process.env.STREAM_QUEUE || 'stream-extract';
const REDIS_URL = process.env.REDIS_URL;
const PROVIDER_ORDER = (process.env.PROVIDERS || 'Videasy').split(',').map((s) => s.trim());
const HEALTH_PORT = Number(process.env.PORT || 8790);
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 25 * 60 * 1000);

if (!REDIS_URL) {
  console.error('REDIS_URL is required');
  process.exit(1);
}

// BullMQ requires maxRetriesPerRequest: null on the connection.
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

// In-process cache — extracted m3u8 URLs are short-lived; a browser launch per
// job is expensive, so repeat requests for the same title reuse the result.
const cache = new Map();
const keyOf = (d) => `${d.type}:${d.id}:${d.season || ''}:${d.episode || ''}`;

async function resolve(data) {
  const k = keyOf(data);
  const c = cache.get(k);
  if (c && Date.now() - c.at < CACHE_TTL_MS) return { ...c.value, cached: true };

  for (const provider of PROVIDER_ORDER) {
    try {
      const r = await extractStream(provider, data, { timeoutMs: 45000 });
      if (r.stream) {
        const value = {
          url: r.stream.url,
          headers: r.stream.headers,
          subtitles: r.stream.subtitles,
          type: 'hls',
          resolver: provider,
        };
        cache.set(k, { at: Date.now(), value });
        return value;
      }
    } catch (e) {
      console.error(`[extract] ${provider} failed:`, e.message);
    }
  }
  return null;
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const t0 = Date.now();
    const result = await resolve(job.data);
    if (!result) throw new Error('no_source'); // job fails; producer treats as "no stream"
    console.log(`[job ${job.id}] ${keyOf(job.data)} -> ${result.resolver} in ${Date.now() - t0}ms${result.cached ? ' (cache)' : ''}`);
    return result;
  },
  { connection, concurrency: Number(process.env.CONCURRENCY || 1) },
);

worker.on('failed', (job, err) => console.error(`[job ${job?.id}] failed:`, err.message));
worker.on('ready', () => console.log(`rb-extractor worker ready on queue "${QUEUE_NAME}" (providers: ${PROVIDER_ORDER.join(',')})`));

// Minimal HTTP server purely for the Coolify healthcheck (workers have no port).
http
  .createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, queue: QUEUE_NAME, cached: cache.size }));
    } else {
      res.writeHead(404);
      res.end('not found');
    }
  })
  .listen(HEALTH_PORT, () => console.log(`health endpoint on :${HEALTH_PORT}/health`));

const shutdown = async () => {
  await worker.close();
  await connection.quit();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
