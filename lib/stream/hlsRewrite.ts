/**
 * Rewrite an HLS playlist so that every URI it references is routed back
 * through our own proxy. This is what lets a referer/CORS-locked stream play
 * in the browser: the browser only ever talks to our origin, and the proxy
 * re-attaches the upstream's required headers on each hop.
 */

function buildProxyUrl(
  proxyBase: string,
  absoluteUrl: string,
  headers: Record<string, string>
): string {
  const h = Buffer.from(JSON.stringify(headers)).toString('base64url');
  return `${proxyBase}?url=${encodeURIComponent(absoluteUrl)}&h=${h}`;
}

/** Resolve a possibly-relative URI against the playlist's own URL. */
function absolutize(uri: string, baseUrl: string): string {
  try {
    return new URL(uri, baseUrl).toString();
  } catch {
    return uri;
  }
}

/** Rewrite a `URI="..."` attribute found inside an #EXT-X-* tag. */
function rewriteUriAttr(
  line: string,
  baseUrl: string,
  proxyBase: string,
  headers: Record<string, string>
): string {
  return line.replace(/URI="([^"]+)"/g, (_m, uri) => {
    const abs = absolutize(uri, baseUrl);
    return `URI="${buildProxyUrl(proxyBase, abs, headers)}"`;
  });
}

/**
 * @param body       raw m3u8 text
 * @param baseUrl    the absolute URL the playlist was fetched from (for relative resolution)
 * @param proxyBase  our proxy endpoint, e.g. "/api/stream/proxy"
 * @param headers    upstream headers to carry on every child request (Referer/Origin/...)
 */
export function rewritePlaylist(
  body: string,
  baseUrl: string,
  proxyBase: string,
  headers: Record<string, string>
): string {
  const lines = body.split(/\r?\n/);
  const out = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return line;

    if (trimmed.startsWith('#')) {
      // Tags that embed a URI="" attribute (keys, audio/sub renditions, maps).
      if (/^#EXT-X-(KEY|MEDIA|MAP|I-FRAME-STREAM-INF|SESSION-KEY)/.test(trimmed)) {
        return rewriteUriAttr(line, baseUrl, proxyBase, headers);
      }
      return line; // other directives pass through untouched
    }

    // A bare line: either a segment URI or a sub-playlist URI.
    const abs = absolutize(trimmed, baseUrl);
    return buildProxyUrl(proxyBase, abs, headers);
  });
  return out.join('\n');
}

/** Heuristic: does this look like an HLS playlist body? */
export function looksLikePlaylist(contentType: string | null, body: string): boolean {
  if (contentType) {
    const ct = contentType.toLowerCase();
    if (ct.includes('mpegurl') || ct.includes('m3u8')) return true;
    if (ct.includes('video/') || ct.includes('octet-stream')) return false;
  }
  return body.trimStart().startsWith('#EXTM3U');
}
