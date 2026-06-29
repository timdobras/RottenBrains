// vidlink-direct.mjs — browser-free vidlink.pro resolver.
//
// Replaces the ~30–60s headed-browser path with a single ~1s HTTP call.
//
// HOW IT WORKS (reverse-engineered 2026-06-30):
//   vidlink's client computes an "encoded id" via a Go-compiled WASM
//   (/fu.wasm, loaded by /script.js = Go's wasm_exec runtime) which calls
//   libsodium's crypto_secretbox_easy. We reproduced it in pure Node:
//
//     plaintext   = utf8(tmdbId) || uint64_be(expiryUnixSeconds)
//     nonce       = 24 zero bytes            (constant)
//     key         = <KEY below>              (extracted from fu.wasm)
//     box         = crypto_secretbox_easy(plaintext, nonce, key)   // tag||ct
//     encodedId   = base64url_nopad( nonce || box )
//
//   The id type (movie/tv) and season/episode are NOT encoded — they are
//   plain URL path segments. So getAdv/encodeVidlinkId takes ONLY the tmdb id.
//
//   TIME-BOUND: the embedded uint64 is an EXPIRY. The server requires
//   expiry > serverNow (an id with ts=now is rejected → 200 empty). The
//   official client uses now+120s. We do the same; an id is valid ~until its
//   embedded expiry, so generate fresh per request (cheap, local).
//
//   RESPONSE: plain JSON (NOT encrypted — the old AES-CBC response scheme is
//   gone). Shape: { sourceId, stream: { qualities:{ "360":{type:"mp4",url,…},
//   "480":…, "720":…, "1080":… }, captions:[{url,language,type:"srt",…}],
//   flags, TTL } }.  A 200 with an empty body = no source for that title.
//
// IF IT BREAKS (vidlink rotates the key/algorithm): re-extract the key by
// running their own fu.wasm under Node and hooking sodium — see
// extract-vidlink-key.mjs. Then update KEY_HEX below. The headed-browser
// driver (lib.mjs) remains the resilient fallback.
//
// Requires: libsodium-wrappers   (npm i libsodium-wrappers)

import _sodium from 'libsodium-wrappers';

await _sodium.ready;
const sodium = _sodium;

// Secret key extracted from vidlink.pro/fu.wasm (Go WASM) on 2026-06-30.
const KEY_HEX = 'c75136c5668bbfe65a7ecad431a745db68b5f381555b38d8f6c699449cf11fcd';
const KEY = sodium.from_hex(KEY_HEX);
const ZERO_NONCE = new Uint8Array(24);

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';

// How far in the future to date the expiry. Must be > server clock skew +
// request latency. The official client uses 120s.
const EXPIRY_LEAD_SECONDS = 120;

/**
 * Reproduce vidlink's getAdv(tmdbId) → encoded id (pure Node, no browser).
 * Only the tmdb id is encoded; movie/tv + season/episode are URL path segments.
 */
export function encodeVidlinkId(tmdbId, expirySeconds = Math.floor(Date.now() / 1000) + EXPIRY_LEAD_SECONDS) {
  const id = Buffer.from(String(tmdbId), 'utf8');
  const ts = Buffer.alloc(8);
  ts.writeBigUInt64BE(BigInt(expirySeconds));
  const plaintext = Buffer.concat([id, ts]);
  const box = sodium.crypto_secretbox_easy(plaintext, ZERO_NONCE, KEY); // tag||ct
  const out = new Uint8Array(ZERO_NONCE.length + box.length);
  out.set(ZERO_NONCE, 0);
  out.set(box, ZERO_NONCE.length);
  return sodium.to_base64(out, sodium.base64_variants.URLSAFE_NO_PADDING);
}

/**
 * Call the vidlink data API directly. Returns parsed JSON, or null when the
 * server returns an empty body (no source available for this title).
 */
export async function fetchVidlink({ type, id, season = 1, episode = 1, multiLang = false }) {
  const enc = encodeVidlinkId(id);
  const path =
    type === 'tv'
      ? `tv/${enc}/${season}/${episode}`
      : `movie/${enc}`;
  const url = `https://vidlink.pro/api/b/${path}?multiLang=${multiLang ? 1 : 0}`;
  const res = await fetch(url, { headers: { Referer: 'https://vidlink.pro/', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`vidlink api HTTP ${res.status}`);
  const text = await res.text();
  if (!text) return null; // no source for this title
  return JSON.parse(text);
}

/**
 * Resolve to the RottenBrains worker stream shape.
 * Returns { url, headers, subtitles, type:'mp4', qualities } or null.
 */
export async function resolveVidlink({ type = 'movie', id, season, episode, multiLang = true } = {}) {
  const data = await fetchVidlink({ type, id, season, episode, multiLang });
  const stream = data?.stream;
  const qualities = stream?.qualities || {};
  const labels = Object.keys(qualities)
    .filter((q) => qualities[q]?.url)
    .sort((a, b) => Number(b) - Number(a)); // highest first
  if (!labels.length) return null; // captions-only / no playable mp4

  const subtitles = (stream.captions || []).map((c) => ({
    url: c.url,
    language: c.language,
    type: c.type || 'srt',
  }));

  return {
    url: qualities[labels[0]].url,
    headers: { Referer: 'https://vidlink.pro/' },
    subtitles,
    type: 'mp4',
    qualities: Object.fromEntries(labels.map((q) => [q, qualities[q].url])),
    resolver: 'vidlink-direct',
    sourceId: data.sourceId,
  };
}

// CLI: node vidlink-direct.mjs <type> <id> [season] [episode]
if (import.meta.url === `file://${process.argv[1]}`) {
  const [type = 'movie', id = '27205', season, episode] = process.argv.slice(2);
  const r = await resolveVidlink({ type, id, season, episode });
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}
