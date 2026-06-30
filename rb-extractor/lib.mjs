// patchright is a stealth drop-in for playwright — it passes the non-interactive
// Cloudflare Turnstile that gates providers like vidsrc.fyi/SuperEmbed (when run
// headed). Videasy works with it too.
import { chromium } from 'patchright';

import { tryDirect, hasDirect, DIRECT_PROVIDERS } from './direct.mjs';

// A real Chrome UA; under headed+xvfb the Sec-CH-UA client hints match this
// (no "HeadlessChrome"), which is what defeats the bot detection on these players.
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';

const STEALTH = () => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  window.chrome = { runtime: {} };
  const orig = window.open;
  window.open = () => null; // swallow ad popups
  void orig;
};

function videasyUrl({ type, id, season, episode }) {
  const tail = type === 'tv' ? `/${id}/${season || 1}/${episode || 1}` : `/${id}`;
  return `https://player.videasy.net/${type}${tail}`;
}

function superembedApi({ type, id, season, episode }) {
  const se = type === 'tv' ? `&season=${season || 1}&episode=${episode || 1}` : '';
  return `https://getsuperembed.link/?video_id=${id}&tmdb=1&player_loader=3&preferred_server=0${se}`;
}

// Providers gated by Cloudflare Turnstile (or HeadlessChrome detection) that
// require a headed browser under an X display to pass.
const HEADED_PROVIDERS = new Set(['VidSrc.fyi', 'SuperEmbed', 'vidlink.pro']);

// --- per-provider drivers: navigate + interact; sniffing is generic ---
const DRIVERS = {
  Videasy: async (page, _ctx, params, stop) => {
    await page.goto(videasyUrl(params), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await poke(page, 3, { stop });
  },
  SuperEmbed: async (page, _ctx, params, stop) => {
    // getsuperembed.link → streamingnow.mov (Cloudflare Turnstile + ad-walls).
    // Needs patchright headed + ~40s for the Turnstile to clear.
    await page.goto(superembedApi(params), { waitUntil: 'domcontentloaded', timeout: 30000 });
    const target = (await page.content()).match(/https?:\/\/[^\s"<]+/)?.[0];
    if (!target) throw new Error('superembed: no target url');
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await poke(page, 16, { stop });
  },
  '2Embed': async (page, _ctx, params, stop) => {
    const tail = params.type === 'tv' ? `/${params.id}&s=${params.season || 1}&e=${params.episode || 1}` : `/${params.id}`;
    await page.goto(`https://www.2embed.cc/embed/${params.type}${tail}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await poke(page, 5, { stop });
  },
  'VidSrc.cc': async (page, _ctx, params, stop) => {
    const tail = params.type === 'tv' ? `/${params.id}/${params.season || 1}/${params.episode || 1}` : `/${params.id}`;
    await page.goto(`https://vidsrc.cc/v2/embed/${params.type}${tail}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await poke(page, 5, { stop });
  },
  'VidSrc.fyi': async (page, _ctx, params, stop) => {
    // cloudnestra rcp + Cloudflare Turnstile — needs patchright headed and ~40s
    // for the Turnstile proof-of-work to complete before the m3u8 loads.
    const tail = params.type === 'tv' ? `/${params.id}/${params.season || 1}/${params.episode || 1}` : `/${params.id}`;
    await page.goto(`https://vidsrc.fyi/embed/${params.type}${tail}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await poke(page, 16, { stop });
  },
  'vidlink.pro': async (page, _ctx, params, stop) => {
    // MP4 source (not HLS) + SRT subtitles, served via api/b after some bot
    // checks — needs patchright headed. We sniff the played MP4 + .srt.
    const tail = params.type === 'tv' ? `/${params.id}/${params.season || 1}/${params.episode || 1}` : `/${params.id}`;
    await page.goto(`https://vidlink.pro/${params.type}${tail}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await poke(page, 14, { stop });
  },
};

// Every provider the worker can resolve — direct (browser-free) first, then the
// browser drivers. Surfaced to the app so the UI can offer manual selection.
export const KNOWN_PROVIDERS = [...new Set([...DIRECT_PROVIDERS, ...Object.keys(DRIVERS)])];

// Run a promise but never let it block longer than ms (ad iframes can hang evaluate).
function withTimeout(p, ms) {
  return Promise.race([p, new Promise((resolve) => setTimeout(resolve, ms))]);
}

// Click center + try to start <video> / play buttons across all frames, a few rounds.
// `stop()` (optional) lets the caller short-circuit the instant the stream is
// captured — no point poking (and spawning more ad popups) once we have it.
// We interact almost immediately (short initial settle) and poll on a tight
// cadence so fast providers resolve in a couple seconds instead of being paced
// by fixed 3s rounds. Turnstile-walled providers still get the full budget —
// they just exit early via stop() the moment the m3u8 lands post-challenge.
async function poke(page, rounds, { stop, cadence = 1200, initialDelay = 600 } = {}) {
  await page.waitForTimeout(initialDelay);
  for (let i = 0; i < rounds; i++) {
    if (stop?.()) return;
    await withTimeout(page.mouse.click(640, 360).catch(() => {}), 2000);
    for (const f of page.frames()) {
      if (stop?.()) return;
      await withTimeout(
        f.evaluate(() => {
          document.querySelectorAll('video').forEach((v) => v.play?.().catch(() => {}));
          for (const s of ['.jw-icon-display', '.vjs-big-play-button', '[class*=play i]', '.server', 'li.server', '[data-server]', 'button'])
            document.querySelector(s)?.click?.();
        }).catch(() => {}),
        2000,
      );
    }
    if (stop?.()) return;
    await page.waitForTimeout(cadence);
  }
}

export async function extractStream(providerName, params, { timeoutMs = 90000 } = {}) {
  // Browser-free fast path: providers with a direct resolver (vidlink.pro,
  // spencerdevs, vidrock) resolve in ~1s with no browser.
  if (hasDirect(providerName)) {
    try {
      // A clean null means "no source for this title" — don't waste a browser
      // launch on the same backend; let the worker move to the next provider.
      const direct = await tryDirect(providerName, params);
      return { provider: providerName, params, stream: direct };
    } catch (e) {
      // The direct path itself broke (e.g. rotated key) — fall through to the
      // browser driver if one exists, otherwise report the error.
      if (!DRIVERS[providerName]) return { provider: providerName, params, stream: null, error: e.message };
    }
  }

  const driver = DRIVERS[providerName];
  if (!driver) throw new Error(`unknown provider ${providerName}`);

  // Default headless (works for Videasy and needs no X display). Set HEADED=1
  // to run headed (requires an X server / xvfb) for providers that detect
  // HeadlessChrome (e.g. SuperEmbed). The deployed Videasy-only worker uses
  // headless so it needs no xvfb.
  // Per-provider headed/headless: Turnstile-walled providers need a headed
  // browser (real browser-API probes) under an X display; Videasy works
  // headless (no display). Resilient by design: if xvfb is unavailable, the
  // headless providers still work and headed ones just fail gracefully.
  const headed = process.env.HEADED === '1' || HEADED_PROVIDERS.has(providerName);
  // IMPORTANT: patchright supplies its own stealth. Do NOT add the STEALTH
  // init script or --disable-blink-features=AutomationControlled — those FIGHT
  // patchright's patches and make us MORE detectable (Turnstile then fails).
  const browser = await chromium.launch({
    headless: !headed,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: true });

  const hits = new Map(); // m3u8 url -> referer (HLS)
  const mp4s = new Map(); // mp4 url -> referer (progressive, e.g. vidlink)
  const subs = new Map(); // subtitle url -> referer (captured from the provider; in-sync, no third-party)
  const wire = (pg) =>
    pg.on('request', (r) => {
      const u = r.url();
      if (/\.m3u8(\?|$)/i.test(u) && !hits.has(u)) hits.set(u, r.headers()['referer'] || '');
      // Treat a played <video> source OR a signed-CDN mp4 as the stream (avoids
      // grabbing unsigned ad/preview mp4s).
      if (/\.mp4(\?|$)/i.test(u) && (r.resourceType() === 'media' || /[?&](sign|token|expires|e)=/i.test(u)) && !mp4s.has(u)) mp4s.set(u, r.headers()['referer'] || '');
      if (/\.(vtt|srt)(\?|$)/i.test(u) && !subs.has(u)) subs.set(u, r.headers()['referer'] || '');
    });
  const page = await ctx.newPage();
  wire(page);
  ctx.on('page', (p) => { wire(p); if (p !== page) p.waitForTimeout(800).then(() => p.close().catch(() => {})).catch(() => {}); });

  const result = { provider: providerName, params, stream: null };
  try {
    // Run the driver, but resolve as soon as the m3u8 is captured — don't wait
    // for all poke rounds (ad iframes make that slow/hang). Cap at timeoutMs.
    // `gotStream` doubles as the driver's stop() signal so poking halts the
    // instant we have a stream.
    const gotStream = () => hits.size > 0 || mp4s.size > 0;
    let driverDone = false;
    driver(page, ctx, params, gotStream)
      // Once we have a stream we close the browser early, which makes the
      // still-running poke loop throw a teardown error — ignore it; it's not a
      // real failure. Only surface driver errors when we got nothing.
      .catch((e) => { if (!gotStream()) result.error = e.message; })
      .finally(() => { driverDone = true; });
    const start = Date.now();
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    while (Date.now() - start < timeoutMs) {
      if (gotStream()) {
        // Got a stream — settle briefly to catch the master playlist + subtitle
        // tracks (which can fire a beat later), but bail early once subs land or
        // after a short cap instead of a fixed 1.5s.
        const settleStart = Date.now();
        while (Date.now() - settleStart < 1200) {
          await sleep(200);
          if (subs.size > 0 && Date.now() - settleStart >= 400) break;
        }
        break;
      }
      if (driverDone) break;
      await sleep(250);
    }

    // Prefer HLS (adaptive); fall back to a progressive MP4 (e.g. vidlink).
    const picked = hits.size ? [...hits.entries()][0] : mp4s.size ? [...mp4s.entries()][0] : null;
    if (picked) {
      const [url, referer] = picked;
      const isMp4 = !hits.size;
      const refHost = referer ? new URL(referer).origin + '/' : '';
      // Subtitle tracks captured from the provider (in-sync, no third-party).
      // format tells the proxy whether to convert (browsers need WebVTT, not SRT).
      const subtitles = [...subs.keys()].map((su, i) => ({
        label: i === 0 ? 'English' : `Track ${i + 1}`,
        lang: i === 0 ? 'en' : undefined,
        url: su,
        default: i === 0,
        format: /\.srt(\?|$)/i.test(su) ? 'srt' : 'vtt',
      }));
      result.stream = {
        url,
        headers: refHost ? { Referer: refHost, Origin: refHost.replace(/\/$/, '') } : {},
        subtitles,
        type: isMp4 ? 'mp4' : 'hls',
        resolver: providerName,
      };
    }
  } finally {
    await browser.close();
  }
  return result;
}

// CLI: node lib.mjs <provider> <type> <id> [season] [episode]
if (import.meta.url === `file://${process.argv[1]}`) {
  const [provider, type = 'movie', id = '27205', season, episode] = process.argv.slice(2);
  const r = await extractStream(provider, { type, id, season, episode });
  console.log(JSON.stringify(r, null, 2));
}
