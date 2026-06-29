import http from 'node:http';
import { extractStream } from './lib.mjs';

// Order of providers to try. Videasy is the only one that resolves cleanly
// today; the others are kept for when/if their obstacles (dead origin, broken
// embed flow, Cloudflare Turnstile) clear. See README.
const PROVIDER_ORDER = (process.env.PROVIDERS || 'Videasy').split(',');

const PORT = Number(process.env.PORT || 8790);
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 25 * 60 * 1000); // m3u8s are short-lived
const cache = new Map(); // key -> { at, value }

function key(p) {
  return `${p.type}:${p.id}:${p.season || ''}:${p.episode || ''}`;
}

async function resolve(params) {
  const k = key(params);
  const c = cache.get(k);
  if (c && Date.now() - c.at < CACHE_TTL_MS) return { ...c.value, cached: true };

  for (const provider of PROVIDER_ORDER) {
    try {
      const r = await extractStream(provider.trim(), params, { timeoutMs: 45000 });
      if (r.stream) {
        const value = {
          url: r.stream.url,
          headers: r.stream.headers,
          subtitles: r.stream.subtitles,
          type: 'hls',
          resolver: provider.trim(),
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, providers: PROVIDER_ORDER, cached: cache.size }));
  }
  if (url.pathname !== '/extract') {
    res.writeHead(404);
    return res.end('not found');
  }

  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');
  if ((type !== 'movie' && type !== 'tv') || !id) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'type(movie|tv) and id required' }));
  }
  const params = {
    type,
    id,
    season: url.searchParams.get('season') || undefined,
    episode: url.searchParams.get('episode') || undefined,
  };

  const t0 = Date.now();
  try {
    const result = await resolve(params);
    if (!result) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'no_source' }));
    }
    console.log(`[extract] ${key(params)} -> ${result.resolver} in ${Date.now() - t0}ms${result.cached ? ' (cache)' : ''}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(e.message || e) }));
  }
});

server.listen(PORT, () => console.log(`rb-extractor listening on :${PORT} (providers: ${PROVIDER_ORDER.join(',')})`));
