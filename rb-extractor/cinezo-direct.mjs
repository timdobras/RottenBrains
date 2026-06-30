// cinezo-direct.mjs — browser-free resolver for the "cinezo" provider
// (player.cinezo.live, backed by api host momlover.notyourtype.dad).
//
// Reverse-engineered 2026-06-30 from player.cinezo.live's own JS (they ship
// un-bundled modules named sec-gcm / sec-constants / sec-cryptoHelpers).
//
// FLOW (plain HTTPS, only needs Referer https://player.cinezo.live/):
//   1. POST {API}/auth/generate-token  body {"clientData":{}} -> {token, expiresMs:30000}
//   2. GET  {API}/tulnex1/{movie|tv}/{tmdbId}[/{s}/{e}]
//        headers: x-request-token: <token>, x-response-encryption: aes-gcm
//        -> { "v":"gcm", "payload":"<base64>" }
//   3. decryptGcm(payload) -> JSON { sources:[{url,server,type}], subtitles:[] }
//
// GCM payload layout (base64-decoded bytes):
//   [0:16] salt | [16:28] iv (12B) | [28:-16] ciphertext | [-16:] tag
//   key = SHA256( utf8("Sn00pD0g#RESP_B4SE_K3y_2026!") || salt )   // AES-256-GCM
//
// The decoded source url is pre-wrapped in cinezo's Cloudflare worker
// (txt.primebox.workers.dev) which injects Origin/Referer: vidrock.ru onto the
// real origin storrrrrrm.site. We UNWRAP it and return the raw storrrrrrm.site
// url + those headers, so the worker's own stream proxy serves it (no dependency
// on their worker). NOTE: storrrrrrm.site is the SAME CDN vidrock-direct uses —
// it 403s without Referer/Origin https://vidrock.ru/.
//
// If it breaks: re-pull player.cinezo.live/assets/sec-constants-*.js and
// sec-gcm-*.js, update RESP_BASE_KEY / the slice offsets below.

import crypto from 'node:crypto';

const API = 'https://momlover.notyourtype.dad';
const REFERER = 'https://player.cinezo.live/';
const ORIGIN = 'https://player.cinezo.live';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';

// from sec-constants: p="Sn00pD0g#RESP_B4SE_K3y_2026!" (exported as R, the default key)
const RESP_BASE_KEY = 'Sn00pD0g#RESP_B4SE_K3y_2026!';
// storrrrrrm.site (shared with vidrock) gates on these — the worker proxy must send them.
const STREAM_HEADERS = { Referer: 'https://vidrock.ru/', Origin: 'https://vidrock.ru' };

function decryptGcm(b64, baseKey = RESP_BASE_KEY) {
  const o = Buffer.from(b64, 'base64');
  if (o.length < 44) throw new Error('cinezo payload too short');
  const salt = o.subarray(0, 16);
  const iv = o.subarray(16, 28);
  const tag = o.subarray(o.length - 16);
  const ct = o.subarray(28, o.length - 16);
  const key = crypto.createHash('sha256').update(Buffer.concat([Buffer.from(baseKey, 'utf8'), salt])).digest();
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  const out = Buffer.concat([d.update(ct), d.final()]).toString('utf8');
  try { return JSON.parse(out); } catch { return out; }
}

async function getToken() {
  const r = await fetch(`${API}/auth/generate-token`, {
    method: 'POST',
    headers: { 'User-Agent': UA, Referer: REFERER, Origin: ORIGIN, 'Content-Type': 'application/json', Accept: 'application/json, text/plain, */*' },
    body: JSON.stringify({ clientData: {} }),
  });
  const j = await r.json();
  if (!j?.token) throw new Error('cinezo: no token: ' + JSON.stringify(j).slice(0, 120));
  return j.token;
}

function pathFor({ type, id, season, episode }) {
  return type === 'tv' ? `/tulnex1/tv/${id}/${season || 1}/${episode || 1}` : `/tulnex1/movie/${id}`;
}

// Recover the real origin url + spoof headers from a primebox-wrapped url.
function unwrapPrimebox(u) {
  try {
    if (!/primebox\.workers\.dev/.test(u)) return { url: u, headers: {} };
    const q = new URL(u).searchParams;
    return { url: q.get('url') || u, headers: q.get('headers') ? JSON.parse(q.get('headers')) : {} };
  } catch { return { url: u, headers: {} }; }
}

/** Resolve to the worker stream shape (HLS). Returns null if no source. */
export async function resolveCinezo({ type = 'movie', id, season, episode } = {}) {
  if (!id) throw new Error('cinezo: id required');
  const token = await getToken();
  const res = await fetch(`${API}${pathFor({ type, id, season, episode })}`, {
    headers: { 'User-Agent': UA, Referer: REFERER, Origin: ORIGIN, Accept: 'application/json, */*', 'x-request-token': token, 'x-response-encryption': 'aes-gcm' },
  });
  const env = await res.json();
  if (env?.v !== 'gcm' || !env.payload) throw new Error('cinezo: unexpected envelope ' + JSON.stringify(env).slice(0, 120));
  const data = decryptGcm(env.payload);

  const src = (data?.sources || []).find((s) => s?.url);
  if (!src) return null; // no source for this title — let the worker try the next provider
  const { url, headers } = unwrapPrimebox(src.url);

  const subtitles = (data?.subtitles || [])
    .map((s) => ({ label: s.label || s.language || s.lang, lang: s.language || s.lang, url: s.file || s.url, format: /\.srt(\?|$)/i.test(s.file || s.url || '') ? 'srt' : 'vtt' }))
    .filter((s) => s.url);

  return {
    url,
    // headers the CDN demands (vidrock.ru). Fall back to the unwrapped ones if present.
    headers: Object.keys(headers).length ? headers : STREAM_HEADERS,
    subtitles,
    type: (src.type || 'hls').toLowerCase() === 'mp4' ? 'mp4' : 'hls',
    resolver: 'cinezo-direct',
    server: src.server || src.provider || null,
  };
}

// CLI: node cinezo-direct.mjs <type> <id> [season] [episode]
if (import.meta.url === `file://${process.argv[1]}`) {
  const [type = 'movie', id = '1083381', season, episode] = process.argv.slice(2);
  console.log(JSON.stringify(await resolveCinezo({ type, id, season, episode }), null, 2));
  process.exit(0);
}
