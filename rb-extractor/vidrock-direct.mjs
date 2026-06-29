// vidrock-direct.mjs — browser-free resolver for vidrock.ru (also backs popcornmovies).
//
// Reverse-engineered 2026-06-30. No browser, no Cloudflare. The /api token is a
// deterministic AES-256-CBC of the id (fixed key+iv from the SPA bundle):
//
//   plaintext = type==='tv' ? `${id}_${season}_${episode}` : `${id}`
//   key = utf8("x7k9mPqT2rWvY8zA5bC3nF6hJ2lK4mN9")   iv = utf8(key[0:16])
//   token = base64url( aes-256-cbc(plaintext, key, iv) )   // strip '=', + -> -, / -> _
//   GET https://vidrock.ru/api/{tv|movie}/<token>
//     -> { "Nova":{url:m3u8,type:hls}, "Atlas":{url:mp4,type:mp4}, ... }  (named servers)
//
// Subtitles (plain): GET https://sub.vdrk.site/v2/{tv/<id>/<s>/<e> | movie/<id>}
//   -> [{label, file:".vtt url"}]  (also a /v1/ variant)
//
// Media hosts (storrrrrrm.site / *.workers.dev / hellstorm.lol) are plain; play via
// the stream proxy with Referer https://vidrock.ru/.

import crypto from 'node:crypto';

const KEY = Buffer.from('x7k9mPqT2rWvY8zA5bC3nF6hJ2lK4mN9');
const IV = KEY.subarray(0, 16);
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';

export function vidrockToken(type, id, season, episode) {
  const pt = type === 'tv' ? `${id}_${season || 1}_${episode || 1}` : `${id}`;
  const c = crypto.createCipheriv('aes-256-cbc', KEY, IV);
  const ct = Buffer.concat([c.update(pt, 'utf8'), c.final()]);
  return ct.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function fetchVidrock({ type, id, season, episode }) {
  const token = vidrockToken(type, id, season, episode);
  const url = `https://vidrock.ru/api/${type === 'tv' ? 'tv' : 'movie'}/${token}`;
  const res = await fetch(url, { headers: { Referer: 'https://vidrock.ru/', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`vidrock api HTTP ${res.status}`);
  return res.json(); // { ServerName: { url, type }, ... }
}

async function fetchSubtitles(type, id, season, episode) {
  const path = type === 'tv' ? `tv/${id}/${season || 1}/${episode || 1}` : `movie/${id}`;
  for (const v of ['v2', 'v1']) {
    try {
      const res = await fetch(`https://sub.vdrk.site/${v}/${path}`, { headers: { Referer: 'https://vidrock.ru/', 'User-Agent': UA } });
      if (!res.ok) continue;
      const arr = await res.json();
      const list = Array.isArray(arr) ? arr : arr?.subtitles || [];
      if (list.length) {
        return list.map((s) => ({
          label: s.label || s.language || s.lang,
          lang: s.language || s.lang,
          url: s.file || s.url,
          format: /\.srt(\?|$)/i.test(s.file || s.url || '') ? 'srt' : 'vtt',
        })).filter((s) => s.url);
      }
    } catch { /* try next */ }
  }
  return [];
}

/** Resolve to the worker stream shape (prefers an HLS server). Returns null if none. */
export async function resolveVidrock({ type = 'movie', id, season, episode } = {}) {
  const data = await fetchVidrock({ type, id, season, episode });
  const servers = Object.entries(data || {})
    .filter(([, v]) => v && typeof v.url === 'string')
    .map(([name, v]) => ({ name, url: v.url, type: (v.type || (/\.m3u8/i.test(v.url) ? 'hls' : 'mp4')).toLowerCase() }));
  if (!servers.length) return null;
  const pick = servers.find((s) => s.type === 'hls') || servers[0];
  const subtitles = await fetchSubtitles(type, id, season, episode);
  return {
    url: pick.url,
    headers: { Referer: 'https://vidrock.ru/' },
    subtitles,
    type: pick.type === 'hls' ? 'hls' : 'mp4',
    resolver: 'vidrock-direct',
    servers: servers.map((s) => ({ name: s.name, type: s.type })),
  };
}

// CLI: node vidrock-direct.mjs <type> <id> [season] [episode]
if (import.meta.url === `file://${process.argv[1]}`) {
  const [type = 'tv', id = '124364', season, episode] = process.argv.slice(2);
  console.log(JSON.stringify(await resolveVidrock({ type, id, season, episode }), null, 2));
  process.exit(0);
}
