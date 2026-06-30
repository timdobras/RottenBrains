import './instrument.mjs'; // MUST be first — installs Sentry before bullmq/ioredis/http

import http from 'node:http';

import * as Sentry from '@sentry/node';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { chromium } from 'patchright';

import { extractStream, KNOWN_PROVIDERS } from './lib.mjs';

// --- config ---
const QUEUE_NAME = process.env.STREAM_QUEUE || 'stream-extract';
const REDIS_URL = process.env.REDIS_URL;
// Direct (browser-free, ~1s) resolvers first, browser drivers last. Each provider
// is tried in order until one yields a stream — so the fast paths win when the
// title is available there, and Videasy (browser) is the universal fallback.
const PROVIDER_ORDER = (process.env.PROVIDERS || 'vidlink.pro,spencerdevs,vidrock,Videasy')
  .split(',')
  .map((s) => s.trim());
const HEALTH_PORT = Number(process.env.PORT || 8790);
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 25 * 60 * 1000);
// Availability cache: which providers HAVE a given title (+ subtitle/quality
// metadata). Unlike the stream URL (short-lived token), this is stable, so it
// lives in Redis with a long TTL and is shared across workers + restarts. Lets
// the app instantly show known-good sources for previously-watched titles.
const AVAIL_TTL_S = Number(process.env.AVAIL_TTL_S || 12 * 60 * 60);

if (!REDIS_URL) {
  console.error('REDIS_URL is required');
  process.exit(1);
}

// BullMQ requires maxRetriesPerRequest: null on the connection.
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

// In-process cache — extracted m3u8 URLs are short-lived; a browser launch per
// job is expensive, so repeat requests for the same title reuse the result.
const cache = new Map();
// Cache key includes the requested provider so a forced single-provider result
// is cached separately from the Auto (cascade) result for the same title.
const keyOf = (d) => `${d.type}:${d.id}:${d.season || ''}:${d.episode || ''}:${d.provider || 'auto'}`;
// Title-scoped (provider-independent) key for the shared availability hash.
const availKey = (d) => `rb-extractor:avail:${d.type}:${d.id}:${d.season || ''}:${d.episode || ''}`;

// Record (in Redis) whether a provider has this title, plus light metadata used
// by the UI. `ok:false` means "definitively no source" (we hide it); we only
// write that on a clean no-stream result, never on a thrown/transient error.
async function recordAvailability(data, provider, entry) {
  try {
    const key = availKey(data);
    await connection.hset(key, provider, JSON.stringify({ ...entry, at: Date.now() }));
    await connection.expire(key, AVAIL_TTL_S);
  } catch {
    /* cache write is best-effort */
  }
}

async function resolve(data) {
  const k = keyOf(data);
  const c = cache.get(k);
  if (c && Date.now() - c.at < CACHE_TTL_MS) return { ...c.value, cached: true };

  // A specific `provider` forces just that one; otherwise cascade the default order.
  const order =
    data.provider && KNOWN_PROVIDERS.includes(data.provider) ? [data.provider] : PROVIDER_ORDER;
  for (const provider of order) {
    try {
      const r = await extractStream(provider, data, { timeoutMs: 90000 });
      if (r.stream) {
        const subs = r.stream.subtitles || [];
        const langs = [...new Set(subs.map((s) => s.lang || s.label).filter(Boolean))];
        const value = {
          url: r.stream.url,
          headers: r.stream.headers,
          subtitles: subs,
          type: r.stream.type || 'hls',
          resolver: provider,
        };
        cache.set(k, { at: Date.now(), value });
        recordAvailability(data, provider, {
          ok: true,
          type: value.type,
          subs: subs.length,
          langs,
        });
        return value;
      }
      // resolved cleanly with no stream → this provider doesn't have the title.
      recordAvailability(data, provider, { ok: false, type: null, subs: 0, langs: [] });
    } catch (e) {
      console.error(`[extract] ${provider} failed:`, e.message);
    }
  }
  return null;
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) =>
    // One transaction per extract job — gives per-job timing + ties any error
    // (and the auto-instrumented http/redis spans) to that job in Sentry.
    Sentry.startSpan(
      { name: 'stream-extract', op: 'queue.process', attributes: { 'job.id': String(job.id), 'extract.key': keyOf(job.data) } },
      async () => {
        const t0 = Date.now();
        const result = await resolve(job.data);
        if (!result) throw new Error('no_source'); // job fails; producer treats as "no stream"
        console.log(`[job ${job.id}] ${keyOf(job.data)} -> ${result.resolver} in ${Date.now() - t0}ms${result.cached ? ' (cache)' : ''}`);
        return result;
      },
    ),
  { connection, concurrency: Number(process.env.CONCURRENCY || 1) },
);

worker.on('failed', (job, err) => {
  console.error(`[job ${job?.id}] failed:`, err.message);
  // 'no_source' is an expected outcome (no provider had the title) — capture it
  // as a warning so it's trackable without polluting the error stream.
  Sentry.captureException(err, {
    level: err?.message === 'no_source' ? 'warning' : 'error',
    tags: { component: 'rb-extractor', queue: QUEUE_NAME },
    extra: { jobId: job?.id, data: job?.data },
  });
});
worker.on('ready', () => console.log(`rb-extractor worker ready on queue "${QUEUE_NAME}" (providers: ${PROVIDER_ORDER.join(',')})`));

// Boot self-test → Redis. Since we can't shell into the container, this is how
// we (and future debugging) see the container's real browser capabilities:
// can it launch headless? headed under DISPLAY (xvfb)? Read key rb-extractor:status.
async function selfTest() {
  const status = {
    bootedAt: new Date().toISOString(),
    display: process.env.DISPLAY || null,
    providers: PROVIDER_ORDER,
    availableProviders: KNOWN_PROVIDERS,
    headlessOk: false,
    headedOk: false,
  };
  try {
    const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    await b.close();
    status.headlessOk = true;
  } catch (e) { status.headlessErr = String(e.message || e).slice(0, 180); }
  if (process.env.DISPLAY) {
    try {
      const b = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
      const p = await b.newPage();
      await p.goto('about:blank');
      await b.close();
      status.headedOk = true;
    } catch (e) { status.headedErr = String(e.message || e).slice(0, 180); }
  }
  try { await connection.set('rb-extractor:status', JSON.stringify(status), 'EX', 86400); } catch {}
  console.log('self-test:', JSON.stringify(status));
  // Surface a degraded boot (no browser at all) to Sentry — it's silent otherwise.
  if (!status.headlessOk && !status.headedOk) {
    Sentry.captureMessage('rb-extractor boot: no usable browser', { level: 'error', extra: status });
  }
}
selfTest().catch((e) => Sentry.captureException(e, { tags: { component: 'rb-extractor', phase: 'self-test' } }));

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
  await Sentry.close(2000); // flush buffered events before exit
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
