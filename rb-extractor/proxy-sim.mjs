// proxy-sim.mjs — replicate app/api/stream/proxy semantics to verify a resolved
// stream actually plays THROUGH our proxy (not just that the URL resolves).
//
// Mirrors the real proxy: fetch each hop with the resolver's upstream headers
// (Referer/Origin/UA forwarded on EVERY hop), walk master -> variant -> first
// segment for HLS, or Range-probe an MP4. Reports status + bytes per hop.
//
// Usage: import { proxyCheck } from './proxy-sim.mjs'; await proxyCheck(stream)
//        node proxy-sim.mjs <resolverModule> <type> <id> [s] [e]

const DEFAULT_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';

async function proxyFetch(url, headers, extra = {}) {
  const fwd = { 'User-Agent': headers['User-Agent'] || DEFAULT_UA, Accept: '*/*', ...headers, ...extra };
  return fetch(url, { headers: fwd, redirect: 'follow' });
}

const absolutize = (uri, base) => { try { return new URL(uri, base).toString(); } catch { return uri; } };

function firstUri(playlist, base) {
  for (const raw of playlist.split(/\r?\n/)) {
    const t = raw.trim();
    if (!t || t.startsWith('#')) continue;
    return absolutize(t, base);
  }
  return null;
}

/** Walk the stream exactly as the proxy would. Returns {ok, hops:[...]}. */
export async function proxyCheck(stream) {
  const headers = stream.headers || {};
  const hops = [];
  const note = (label, res, bytes) => hops.push(`${label}: HTTP ${res.status}${bytes != null ? ` (${bytes}B)` : ''}`);

  if (stream.type === 'mp4' || /\.mp4(\?|$)/i.test(stream.url)) {
    const res = await proxyFetch(stream.url, headers, { Range: 'bytes=0-1023' });
    const buf = res.ok || res.status === 206 ? Buffer.from(await res.arrayBuffer()) : null;
    note('mp4 range', res, buf?.length);
    return { ok: (res.status === 206 || res.ok) && (buf?.length > 0), hops };
  }

  // HLS: master -> (variant) -> first segment
  const master = await proxyFetch(stream.url, headers);
  const masterBody = master.ok ? await master.text() : '';
  note('master m3u8', master, masterBody.length);
  if (!master.ok || !masterBody.includes('#EXTM3U')) return { ok: false, hops };

  let mediaUrl = stream.url, mediaBody = masterBody;
  const isMaster = /#EXT-X-STREAM-INF/.test(masterBody);
  if (isMaster) {
    const variantUrl = firstUri(masterBody, stream.url);
    const vr = await proxyFetch(variantUrl, headers);
    mediaBody = vr.ok ? await vr.text() : '';
    note('variant m3u8', vr, mediaBody.length);
    if (!vr.ok) return { ok: false, hops };
    mediaUrl = variantUrl;
  }

  const segUrl = firstUri(mediaBody, mediaUrl);
  if (!segUrl) { hops.push('no segment found'); return { ok: false, hops }; }
  const sr = await proxyFetch(segUrl, headers, { Range: 'bytes=0-65535' });
  const segBuf = sr.ok || sr.status === 206 ? Buffer.from(await sr.arrayBuffer()) : null;
  note('first segment', sr, segBuf?.length);
  return { ok: (sr.ok || sr.status === 206) && segBuf?.length > 0, hops, segHost: new URL(segUrl).host };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [mod, type = 'tv', id = '94997', season, episode] = process.argv.slice(2);
  const m = await import(mod.startsWith('.') || mod.startsWith('/') ? mod : `./${mod}`);
  const resolve = Object.entries(m).find(([k, v]) => /^resolve/.test(k) && typeof v === 'function')?.[1] || m.default;
  const stream = await resolve({ type, id, season, episode });
  if (!stream) { console.log('resolver returned null'); process.exit(1); }
  console.log('resolved:', stream.type, stream.url.slice(0, 80), `(${stream.subtitles?.length || 0} subs)`);
  const r = await proxyCheck(stream);
  console.log(r.ok ? '✅ PLAYS THROUGH PROXY' : '❌ FAILS THROUGH PROXY', r.segHost ? `seg host: ${r.segHost}` : '');
  r.hops.forEach((h) => console.log('  ', h));
  process.exit(r.ok ? 0 : 1);
}
