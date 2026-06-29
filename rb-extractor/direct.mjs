// direct.mjs — browser-free resolvers, normalized to the worker's stream shape.
//
// Each entry resolves a provider with a plain HTTP call (no headless browser),
// returning `{ url, headers, subtitles, type, resolver }` or null. extractStream()
// tries these first and only falls back to the browser drivers when there's no
// direct resolver (or it yields nothing). See PROVIDERS.md for how each is cracked.

import { resolveVidlink } from './vidlink-direct.mjs';
import { resolveSpencer } from './spencerdevs-direct.mjs';
import { resolveVidrock } from './vidrock-direct.mjs';

// providerName -> async ({type,id,season,episode}) => stream|null
const DIRECT_RESOLVERS = {
  'vidlink.pro': resolveVidlink,
  spencerdevs: resolveSpencer,
  vidrock: resolveVidrock,
};

export function hasDirect(name) {
  return Object.prototype.hasOwnProperty.call(DIRECT_RESOLVERS, name);
}

// Normalize a resolver's subtitles to the worker shape: {label,lang,url,default,format}.
function normSubs(subs) {
  return (subs || [])
    .filter((s) => s && s.url)
    .map((s, i) => ({
      label: s.label || s.language || s.lang || (i === 0 ? 'English' : `Track ${i + 1}`),
      lang: s.lang || s.language,
      url: s.url,
      default: i === 0,
      format: s.format || (/\.srt(\?|$)/i.test(s.url) ? 'srt' : 'vtt'),
    }));
}

/**
 * Try the browser-free resolver for `name`. Returns the normalized worker stream,
 * or null (no direct resolver, or it found no source). Throws only on unexpected
 * errors — extractStream catches and falls back to the browser.
 */
export async function tryDirect(name, params) {
  const fn = DIRECT_RESOLVERS[name];
  if (!fn) return null;
  const s = await fn(params);
  if (!s || !s.url) return null;
  return {
    url: s.url,
    headers: s.headers || {},
    subtitles: normSubs(s.subtitles),
    type: s.type || (/\.m3u8(\?|$)/i.test(s.url) ? 'hls' : 'mp4'),
    resolver: name,
  };
}
