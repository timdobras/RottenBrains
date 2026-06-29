// patchright is a stealth drop-in for playwright — it passes the non-interactive
// Cloudflare Turnstile that gates providers like vidsrc.fyi/SuperEmbed (when run
// headed). Videasy works with it too.
import { chromium } from 'patchright';

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
const HEADED_PROVIDERS = new Set(['VidSrc.fyi', 'SuperEmbed']);

// --- per-provider drivers: navigate + interact; sniffing is generic ---
const DRIVERS = {
  Videasy: async (page, _ctx, params) => {
    await page.goto(videasyUrl(params), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await poke(page, 3);
  },
  SuperEmbed: async (page, _ctx, params) => {
    // getsuperembed.link → streamingnow.mov (Cloudflare Turnstile + ad-walls).
    // Needs patchright headed + ~40s for the Turnstile to clear.
    await page.goto(superembedApi(params), { waitUntil: 'domcontentloaded', timeout: 30000 });
    const target = (await page.content()).match(/https?:\/\/[^\s"<]+/)?.[0];
    if (!target) throw new Error('superembed: no target url');
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await poke(page, 16);
  },
  '2Embed': async (page, _ctx, params) => {
    const tail = params.type === 'tv' ? `/${params.id}&s=${params.season || 1}&e=${params.episode || 1}` : `/${params.id}`;
    await page.goto(`https://www.2embed.cc/embed/${params.type}${tail}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await poke(page, 5);
  },
  'VidSrc.cc': async (page, _ctx, params) => {
    const tail = params.type === 'tv' ? `/${params.id}/${params.season || 1}/${params.episode || 1}` : `/${params.id}`;
    await page.goto(`https://vidsrc.cc/v2/embed/${params.type}${tail}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await poke(page, 5);
  },
  'VidSrc.fyi': async (page, _ctx, params) => {
    // cloudnestra rcp + Cloudflare Turnstile — needs patchright headed and ~40s
    // for the Turnstile proof-of-work to complete before the m3u8 loads.
    const tail = params.type === 'tv' ? `/${params.id}/${params.season || 1}/${params.episode || 1}` : `/${params.id}`;
    await page.goto(`https://vidsrc.fyi/embed/${params.type}${tail}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await poke(page, 16);
  },
};

// Run a promise but never let it block longer than ms (ad iframes can hang evaluate).
function withTimeout(p, ms) {
  return Promise.race([p, new Promise((resolve) => setTimeout(resolve, ms))]);
}

// Click center + try to start <video> / play buttons across all frames, a few rounds.
async function poke(page, rounds) {
  for (let i = 0; i < rounds; i++) {
    await page.waitForTimeout(3000);
    await withTimeout(page.mouse.click(640, 360).catch(() => {}), 2500);
    for (const f of page.frames()) {
      await withTimeout(
        f.evaluate(() => {
          document.querySelectorAll('video').forEach((v) => v.play?.().catch(() => {}));
          for (const s of ['.jw-icon-display', '.vjs-big-play-button', '[class*=play i]', '.server', 'li.server', '[data-server]', 'button'])
            document.querySelector(s)?.click?.();
        }).catch(() => {}),
        2500,
      );
    }
  }
}

export async function extractStream(providerName, params, { timeoutMs = 90000 } = {}) {
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

  const hits = new Map(); // m3u8 url -> referer
  const subs = new Map(); // subtitle url -> referer (captured from the provider; in-sync, no third-party)
  const wire = (pg) =>
    pg.on('request', (r) => {
      const u = r.url();
      if (/\.m3u8(\?|$)/i.test(u) && !hits.has(u)) hits.set(u, r.headers()['referer'] || '');
      if (/\.(vtt|srt)(\?|$)/i.test(u) && !subs.has(u)) subs.set(u, r.headers()['referer'] || '');
    });
  const page = await ctx.newPage();
  wire(page);
  ctx.on('page', (p) => { wire(p); if (p !== page) p.waitForTimeout(800).then(() => p.close().catch(() => {})).catch(() => {}); });

  const result = { provider: providerName, params, stream: null };
  try {
    // Run the driver, but resolve as soon as the m3u8 is captured — don't wait
    // for all poke rounds (ad iframes make that slow/hang). Cap at timeoutMs.
    let driverDone = false;
    driver(page, ctx, params)
      .catch((e) => { result.error = e.message; })
      .finally(() => { driverDone = true; });
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (hits.size > 0) { await new Promise((r) => setTimeout(r, 1500)); break; } // got it; brief settle for master + subs
      if (driverDone) break;
      await new Promise((r) => setTimeout(r, 500));
    }

    if (hits.size) {
      // master playlists usually come first; prefer one whose URL has .m3u8
      const [url, referer] = [...hits.entries()][0];
      const refHost = referer ? new URL(referer).origin + '/' : '';
      // Subtitle tracks captured from the provider (in-sync, no third-party).
      const subtitles = [...subs.keys()].map((su, i) => ({
        label: i === 0 ? 'English' : `Track ${i + 1}`,
        lang: i === 0 ? 'en' : undefined,
        url: su,
        default: i === 0,
      }));
      result.stream = {
        url,
        headers: refHost ? { Referer: refHost, Origin: refHost.replace(/\/$/, '') } : {},
        subtitles,
        type: 'hls',
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
