import { chromium } from 'playwright';

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

// --- per-provider drivers: navigate + interact; sniffing is generic ---
const DRIVERS = {
  Videasy: async (page, _ctx, params) => {
    await page.goto(videasyUrl(params), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await poke(page, 3);
  },
  SuperEmbed: async (page, _ctx, params) => {
    await page.goto(superembedApi(params), { waitUntil: 'domcontentloaded', timeout: 30000 });
    const target = (await page.content()).match(/https?:\/\/[^\s"<]+/)?.[0];
    if (!target) throw new Error('superembed: no target url');
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await poke(page, 5);
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
    const tail = params.type === 'tv' ? `/${params.id}/${params.season || 1}/${params.episode || 1}` : `/${params.id}`;
    await page.goto(`https://vidsrc.fyi/embed/${params.type}${tail}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await poke(page, 6);
  },
};

// Click center + try to start <video> / play buttons across all frames, a few rounds.
async function poke(page, rounds) {
  for (let i = 0; i < rounds; i++) {
    await page.waitForTimeout(3000);
    try { await page.mouse.click(640, 360); } catch {}
    for (const f of page.frames()) {
      try {
        await f.evaluate(() => {
          document.querySelectorAll('video').forEach((v) => v.play?.().catch(() => {}));
          for (const s of ['.jw-icon-display', '.vjs-big-play-button', '[class*=play i]', '.server', 'li.server', '[data-server]', 'button'])
            document.querySelector(s)?.click?.();
        });
      } catch {}
    }
  }
}

export async function extractStream(providerName, params, { timeoutMs = 45000 } = {}) {
  const driver = DRIVERS[providerName];
  if (!driver) throw new Error(`unknown provider ${providerName}`);

  const browser = await chromium.launch({
    headless: false, // headed under xvfb → real client hints
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
  });
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: true });
  await ctx.addInitScript(STEALTH);

  const hits = new Map(); // m3u8 url -> referer
  const wire = (pg) =>
    pg.on('request', (r) => {
      const u = r.url();
      if (/\.m3u8(\?|$)/i.test(u) && !hits.has(u)) hits.set(u, r.headers()['referer'] || '');
    });
  const page = await ctx.newPage();
  wire(page);
  ctx.on('page', (p) => { wire(p); if (p !== page) p.waitForTimeout(800).then(() => p.close().catch(() => {})).catch(() => {}); });

  const result = { provider: providerName, params, stream: null };
  try {
    await Promise.race([
      driver(page, ctx, params),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
    ]).catch((e) => { result.error = e.message; });

    // settle a moment in case the m3u8 fires late
    for (let i = 0; i < 4 && hits.size === 0; i++) await page.waitForTimeout(1500);

    if (hits.size) {
      // master playlists usually come first; prefer one whose URL has .m3u8
      const [url, referer] = [...hits.entries()][0];
      const refHost = referer ? new URL(referer).origin + '/' : '';
      result.stream = {
        url,
        headers: refHost ? { Referer: refHost, Origin: refHost.replace(/\/$/, '') } : {},
        subtitles: [],
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
