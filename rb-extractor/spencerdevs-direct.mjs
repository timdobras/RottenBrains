// spencerdevs-direct.mjs — browser-free resolver for spencerdevs.xyz (→ 1shows.app).
//
// Reverse-engineered 2026-06-30. No browser, no Cloudflare clearance, NO hardcoded
// secret — all AES key material travels inside the response blob.
//
// FLOW
//   GET https://servers.spencerdevs.xyz/<serverId>/<t=tv|m=movie>/<tmdb>/<s>/<e>
//     -> { "snoopdog": "<space-separated 8-bit binary octets>" }   (plain GET, no token)
//   decode(snoopdog):
//     chars  = octets.map(v => stdBase64Alphabet[v] or "" for the value-64 padding).join('')
//     buf    = base64-decode(chars)
//     pw=buf[0:32], salt=buf[32:48], iv=buf[48:64], ciphertext=buf[64:]
//     key    = pbkdf2(pw, salt, 100000, 32, 'sha512')
//     url    = aes-256-cbc-decrypt(ciphertext, key, iv)   -> https://cdn.1shows.app/e/<id>/master.m3u8
//   The m3u8 (cdn.1shows.app) and subtitles (subs.1shows.app) are plain/unauthenticated.
//
// Different <serverId>s are alternate sources; we try a list until one resolves.
// Subtitles: GET https://subs.1shows.app/data/subs/{tv|movie}/<tmdb>[/<s>/<e>]  (plain).

import crypto from 'node:crypto';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';
const STD_B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const SERVERS = [25, 20, 1, 2, 3]; // observed working ids; tried in order

export function decodeSnoopdog(snoopdog) {
  const chars = snoopdog.trim().split(/\s+/).map((o) => {
    const v = parseInt(o, 2);
    return v < 64 ? STD_B64[v] : ''; // value 64 == base64 '=' padding -> dropped (matches eM[e]||'')
  }).join('');
  const buf = Buffer.from(chars, 'base64');
  const pw = buf.subarray(0, 32);
  const salt = buf.subarray(32, 48);
  const iv = buf.subarray(48, 64);
  const ct = buf.subarray(64);
  const key = crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha512');
  const d = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return d.update(ct, undefined, 'utf8') + d.final('utf8');
}

async function fetchServer(serverId, type, id, season, episode) {
  const t = type === 'tv' ? 't' : 'm';
  const url = `https://servers.spencerdevs.xyz/${serverId}/${t}/${id}/${season || 1}/${episode || 1}`;
  const res = await fetch(url, { headers: { Referer: 'https://spencerdevs.xyz/', 'User-Agent': UA } });
  if (!res.ok) return null;
  const j = await res.json().catch(() => null);
  if (!j?.snoopdog) return null;
  try {
    const out = decodeSnoopdog(j.snoopdog);
    return out.includes('.m3u8') || out.includes('.txt') || out.includes('playlist') || out.startsWith('http') ? out : null;
  } catch {
    return null;
  }
}

async function fetchSubtitles(type, id, season, episode) {
  const path = type === 'tv' ? `tv/${id}/${season || 1}/${episode || 1}` : `movie/${id}`;
  try {
    const res = await fetch(`https://subs.1shows.app/data/subs/${path}`, { headers: { Referer: 'https://spencerdevs.xyz/', 'User-Agent': UA } });
    if (!res.ok) return [];
    const j = await res.json();
    const list = Array.isArray(j) ? j : j?.subtitles || [];
    return list.map((s) => {
      const u = s.url || s.file || '';
      const full = u.startsWith('http') ? u : `https://subs.1shows.app${u}`;
      return {
        label: s.label || s.language || s.lang,
        lang: s.language || s.lang,
        url: full,
        format: /\.srt(\?|$)/i.test(full) ? 'srt' : 'vtt',
      };
    }).filter((s) => s.url);
  } catch {
    return [];
  }
}

/** Resolve to the RottenBrains worker stream shape, or null. */
export async function resolveSpencer({ type = 'movie', id, season, episode, servers = SERVERS } = {}) {
  let url = null;
  for (const sid of servers) {
    url = await fetchServer(sid, type, id, season, episode);
    if (url) break;
  }
  if (!url) return null;
  const isHls = /\.m3u8|playlist|\.txt/i.test(url);
  const subtitles = await fetchSubtitles(type, id, season, episode);
  return {
    url,
    headers: { Referer: 'https://spencerdevs.xyz/' },
    subtitles,
    type: isHls ? 'hls' : 'mp4',
    resolver: 'spencerdevs-direct',
  };
}

// CLI: node spencerdevs-direct.mjs <type> <id> [season] [episode]
if (import.meta.url === `file://${process.argv[1]}`) {
  const [type = 'tv', id = '94997', season, episode] = process.argv.slice(2);
  console.log(JSON.stringify(await resolveSpencer({ type, id, season, episode }), null, 2));
  process.exit(0);
}
