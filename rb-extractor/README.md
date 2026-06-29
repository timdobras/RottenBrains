# rb-extractor

Headless-browser HLS extractor microservice for the RottenBrains **ad-free native player**.

## What it does

Given a TMDB id, it loads a streaming provider's embed page in a real (headed,
under xvfb) Chromium, lets the page's JS run, and **sniffs the network for the
`.m3u8`** the player fetches — then returns that raw stream URL plus the headers
(Referer/Origin) the CDN requires. RottenBrains then proxies and plays it in its
own player, so the user never sees the provider's ad-laden page.

Today it resolves **Videasy** (the app's default provider). Other providers are
either dead, or gated behind anti-bot/Turnstile/`rcp` flows that need
per-provider work (see the project notes).

## API

```
GET /extract?type=movie&id=27205
GET /extract?type=tv&id=1399&season=1&episode=1
  -> { url, headers, subtitles, type:"hls", resolver }   (404 {error:"no_source"} if nothing found)
GET /health
```

Results are cached in-memory for 25 min (`CACHE_TTL_MS`) — extracted m3u8 URLs
are short-lived, and each cold extract launches a browser (~10s).

## Run locally

```
npm install
xvfb-run -a node server.mjs      # needs xvfb + xauth installed
# or: node lib.mjs Videasy movie 27205   (one-shot CLI test)
```

## Deploy (Coolify)

Build the Docker image (it bundles Chromium + xvfb) and run it as its own
service. Then point RottenBrains at it:

```
STREAM_EXTRACTOR_URL=http://rb-extractor:8790
```

(use the internal service hostname on the Coolify network — the extractor does
NOT need to be publicly exposed; only RottenBrains' server talks to it).

## Notes / scaling

- One Chromium per cold resolve (~10s, heavy). The cache absorbs repeat views.
- For production, add a concurrency cap and consider reusing one browser across
  requests (new context per request) instead of launch-per-request.
- `PROVIDERS` env = comma-separated resolver order (default `Videasy`).
