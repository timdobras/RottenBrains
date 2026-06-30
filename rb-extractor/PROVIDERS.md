# Streaming Providers — Master Catalog

Everything we know about each provider RottenBrains can pull streams from: how it
serves video, the exact request to make, whether it's callable **without a browser**,
its subtitle endpoint, and current status. Last full survey: **2026-06-30**.

> These sites rotate encodings and die often (embed.su + vidsrc.rip parked between
> the first brief and this survey). Re-verify before relying on any "direct" path.

## Legend
- **Direct** = resolvable from Node with a plain HTTP call (no headless browser).
- **Browser** = needs a real browser (Cloudflare clearance and/or obfuscated client JS).
- **Dead** = parked / offline.
- CF column: page/API Cloudflare gating. "passive" = invisible JS challenge that
  self-resolves; "bot" = bot-management 403 to plain clients; "hard" = managed
  interactive challenge headless can't pass.

---

## ✅ Direct (browser-free) — working / cracked

### vidlink.pro  — DONE, shipped as `vidlink-direct.mjs`
- **CF:** none on the API.
- **Encode id (pure Node):** `base64url( zeroNonce(24) || secretbox_easy(utf8(tmdbId) || uint64be(nowSec+120), zeroNonce, key) )`
  key = `c75136c5668bbfe65a7ecad431a745db68b5f381555b38d8f6c699449cf11fcd`
- **Call:** `GET https://vidlink.pro/api/b/{movie|tv}/<encId>[/{s}/{e}]?multiLang=0` , header `Referer: https://vidlink.pro/`
- **Response:** plain JSON `{sourceId, stream:{qualities:{360..1080:{type:mp4,url}}, captions:[{url,language,type:srt}]}}`. mp4 urls CloudFront-signed, play with vidlink Referer.
- **Time-bound:** embedded uint64 is an expiry; server needs expiry>now → regen per request.
- **Re-extract key if rotated:** `node extract-vidlink-key.mjs`.
- **Subtitles:** in the same JSON (`stream.captions`).

---

### spencerdevs.xyz → 1shows.app  — ✅ DONE, shipped as `spencerdevs-direct.mjs`
- **CF:** passive; the source endpoint is directly callable from Node (no clearance).
- **Source call (PLAIN params, no token to forge):**
  `GET https://servers.spencerdevs.xyz/{serverId}/{t=tv|m=movie}/{tmdb}/{s}/{e}`
  → `{"snoopdog":"<space-separated 8-bit binary octets>"}`. serverIds are alternate
  sources (25/20/1 work; others 500=unavailable) — try a list until one resolves.
- **Decode (pure Node, NO hardcoded secret — key travels in the blob):**
  octets → value = std-base64 index (value 64 = '=' padding, drop) → join → base64-decode →
  `pw=buf[0:32], salt=buf[32:48], iv=buf[48:64], ct=buf[64:]`;
  `key=pbkdf2(pw,salt,100000,32,'sha512')`; `aes-256-cbc-decrypt(ct,key,iv)` → m3u8 url.
- **Media:** `cdn.1shows.app/e/<id>/master.m3u8` — plain HLS master, **no per-request token**.
- **Subs:** `GET https://subs.1shows.app/data/subs/{tv/<tmdb>/<s>/<e>|movie/<tmdb>}` (plain) →
  `{subtitles:[{lang,url:"/subs/.../<lang>.vtt"}]}` (relative urls; ~136 langs). Resolves ~900ms.

### vidrock.ru  — ✅ DONE, shipped as `vidrock-direct.mjs`  (also backs **popcornmovies**)
- **CF:** none.
- **Token (deterministic AES, key from `/assets/index-*.js`):**
  `plaintext = type==='tv' ? `${id}_${s}_${e}` : `${id}``;
  key = utf8(`x7k9mPqT2rWvY8zA5bC3nF6hJ2lK4mN9`), iv = utf8(key[0:16]);
  `token = base64url( aes-256-cbc(plaintext, key, iv) )` (CryptoJS CBC+PKCS7).
- **Source call:** `GET https://vidrock.ru/api/{tv|movie}/<token>` →
  `{Nova:{url:m3u8,type:hls}, Orion:{...}, Atlas:{url:mp4}, ...}` (named servers, real urls).
- **Media:** `storrrrrrm.site/.../master.m3u8`, segments off tiktokcdn (disguised .png); `*.workers.dev` mirrors.
- **Subs:** `GET https://sub.vdrk.site/{v2|v1}/tv/{tmdb}/{s}/{e}` (plain) → `[{label,file:.vtt}]`.
- **Proxy:** ✅ verified (master→variant→segment 206).

### cinezo (player.cinezo.live → momlover.notyourtype.dad)  — ✅ DONE, shipped as `cinezo-direct.mjs`
- Found via **456movie.nl** (see Aggregators). **CF:** none. Cracked from cinezo's own
  *un-bundled* JS modules (`sec-gcm`, `sec-constants`, `sec-cryptoHelpers`).
- **Token:** `POST https://momlover.notyourtype.dad/auth/generate-token` body `{"clientData":{}}`
  → `{token, expiresMs:30000}` (token lives 30s; mint fresh per request).
- **Source call:** `GET .../tulnex1/{movie|tv}/{tmdb}[/{s}/{e}]`, headers
  `x-request-token: <token>` + `x-response-encryption: aes-gcm`, `Referer: https://player.cinezo.live/`
  → `{"v":"gcm","payload":"<base64>"}`.
- **Decrypt (pure Node, AES-256-GCM):** `b=base64decode(payload)`; `salt=b[0:16]`, `iv=b[16:28]`,
  `tag=b[-16:]`, `ct=b[28:-16]`; `key=SHA256(utf8("Sn00pD0g#RESP_B4SE_K3y_2026!") || salt)`
  → JSON `{sources:[{url,server,type}], subtitles}`.
- **Media:** decoded url is pre-wrapped in cinezo's CF worker `txt.primebox.workers.dev`; we
  **unwrap** to the raw origin `storrrrrrm.site/stream/<id>/master.m3u8` + the headers it spoofs.
  **Same `storrrrrrm.site` CDN as vidrock** — 403s without `Referer`/`Origin: https://vidrock.ru/`,
  so the worker's stream proxy must send those (it does).
- **Verified live 2026-06-30:** movie (Backrooms 1083381) + TV (Severance 95396 s1e1) both → working
  master playlists; raw url confirmed 403 without the vidrock headers.
- **If it breaks:** re-pull `player.cinezo.live/assets/sec-constants-*.js` + `sec-gcm-*.js`.

## ⚠️ Direct-crackable candidates (no full browser needed; one piece to reverse)

### 111movies.net → *.nexlunar99.site  (FastStream player)  — DEEP WALL (browser only)
- **CF:** none on the page.
- **Source call:** tokenized GET path `https://111movies.net/<bignum>/ti/dad/<uuid>/<sha256>/<token>/w/<huge-obfuscated-blob>/sr`
  → JSON server list `[{name,description,image,data:"<ivHex>:<ctHex>"}]`.
- **2026-06-30 attempt (per user):** tried to go direct. Blockers found:
  - **Path is single-use/time-bound** — replaying a browser-captured `/ti/dad/…/sr` URL
    from Node → **404** (works only in the live browser session). So you can't capture+replay;
    you must *generate* valid paths.
  - **Generator is heavily obfuscated** — `/ti`, `/dad`, `/sr`, `/w/` are not literals
    (built via `join("/")` from obfuscated parts); the 1446-char `<blob>` encodes the request.
  - **Crypto has no findable key** — no `crypto.subtle` calls (hooked a live browser: zero
    importKey/decrypt), no grep-able CryptoJS key; the `data:"iv:ct"` AES-CBC uses a key hidden
    in the obfuscated decoder. (The 64-hex consts in the bundle are FastStream integrity hashes, not it.)
  - **Verdict:** comparable to videasy — needs major deobfuscation of the path generator +
    crypto. **Not a quick browser-free win.** Keep on the browser path.
- **Media:** HLS on `*.nexlunar99.site/s/<id>/<token>.m3u8`.
- **Subs (FREE, reusable):** `GET https://111movies.net/wyzie?id={tmdb}&season={s}&episode={e}` → plain JSON
  `[{display,language,url,encoding}]` (the public **wyzie** subtitle API; works standalone).

---

## 🌐 Browser-only (Cloudflare and/or obfuscated client; keep on the browser path)

### videasy.net / player.videasy.to   (also backs **cineby.at** and **vidking.net**)
> **vidking.net/embed/{type}/{id}** is just another videasy skin: loads `users.videasy.to/api/script.js`,
> metadata from `db.videasy.to`, source from `api.videasy.to/cdn/sources-with-title` → same encrypted
> hex blob → same `yoru.shegu.org` HLS. It ships `vidking.net/assets/wasm/module1.wasm` (likely the
> blob decryptor — a runnable lead for the videasy decrypt), but `api.videasy.to` stays CF-gated.

- **CF:** the API (`api.videasy.to`) is bot-gated (403 to plain clients, TLS/JA3).
- **Flow:** `GET https://api.videasy.to/cdn/sources-with-title?title=&mediaType=&year=&tmdbId=&imdbId=&season=&episode=` (PLAIN params) → **encrypted hex blob** → client decrypts (heavily string-obfuscated webpack chunk, no WASM) → HLS `yoru.shegu.org/video.m3u8?q=<b64>`.
- **Metadata source:** `db.videasy.to/3` (1:1 TMDB mirror).
- **To go direct:** need cf_clearance (or JA3 client / FlareSolverr) **and** crack the decrypt.
- **2026-06-30 progress:**
  - **CF SOLVED browser-free** via JA3 impersonation: `python3 curl_cffi` `requests.get(url, impersonate="chrome", headers={"Referer":"https://player.videasy.to/"})` → HTTP 200 + the encrypted hex blob. No browser, no cookie. (curl/Node TLS still 403; curl_cffi/curl-impersonate/got-scraping needed.) Blob is a fixed-keystream stream cipher — every response shares the same first ~10 bytes (plaintext prefix `{"sources"`).
  - **Decrypt = anti-tamper JS.** vidking ships `vidking.net/assets/wasm/module1.wasm` (AssemblyScript; exports `serve`/`verify`/`decrypt`). Run in Node via `@assemblyscript/loader`: `serve(blob)` returns **112KB of obfuscated JS** (`window.X1..X50` big-ints + a 242-fn decoder ending in an async assign to `window`). That JS computes the m3u8 but **OOMs (2GB) under plain Node `vm` eval** — it's anti-tamper-protected against non-browser envs. `decrypt(blob)` export aborts (assertion 111:7) without the serve-set state.
  - **Hybrid attempt (curl_cffi CF + browser-only decrypt) — tried, doesn't pay off:**
    `serve(blob)` *does* run cleanly in a lightweight secure-context headless page (route a
    blank https page for `player.videasy.to`, `page.evaluate(serveOut)` — no CF, no real page
    load, no OOM since browser globals exist). BUT `serve()` only installs **setup state**:
    `window.X1..X50` + 15 obfuscated helper fns (`_0x…`). It does NOT expose the m3u8 — no new
    window string/object holds it, no helper fn returns it, no media fetch fires. `_0x36` is just
    `crypto.subtle.digest` (intermediate hash). Extracting the URL needs the player's full
    multi-step decode orchestration reproduced = deobfuscation. And since a real browser passes
    videasy's CF anyway, the curl_cffi bypass saves nothing here.
  - **Verdict:** keep videasy (+cineby/vidking) on the **optimized browser-sniff** (~3.7s,
    proxy-verified) — the hybrid doesn't beat it. curl_cffi CF-bypass is documented for the
    future (useful if the decrypt is ever deobfuscated, or for other CF-gated APIs).
  - **2026-06-30 (via 456movie.nl) — corroboration + exact decrypt anatomy.** 456movie reaches
    videasy through THREE dropdown skins (vidking / videasy4k=`player.videasy.to` / vidsrccc) — one
    decrypt covers all three. The decryptor lives in `player.videasy.to/module.wasm` (same as
    vidking's module1.wasm) + chunk `9973`. Decode = `w(blob, key, tmdbId)`:
    1. `Function(wasm.serve())()` evals the 112KB obfuscated PoW → sets `window.hash`
    2. `wasm.verify(window.hash)` (anti-tamper gate)
    3. `r = wasm.decrypt(blob, tmdbId)` (layer 1)
    4. `CryptoJS.AES.decrypt(r, key).toString(Utf8)` (layer 2), where
       `key = b35ebba4 = new b.Z().encode(I)` + magic const `d486ae1ce6fdbe63b60bd1704541fcf0`.
    Re-confirmed the wasm instantiates in Node and `serve()` returns pure `window`-only JS (no DOM),
    but eval'ing it **OOMs even at 3GB heap** — runaway, environment-sensitive, anti-port by design.
    Direct `api.videasy.to` GET works with just `Referer` from this box (no CF seen on this path/IP
    today; the bot-gating noted above is IP/TLS-dependent). **Still browser-only in practice.**

### popcornmovies.io   (delegates to **vidrock** via api.dlproxy.com)
- **CF:** bot (`/api/sources` → `{"error":"forbidden"}` to plain curl).
- **Calls (PLAIN params):** `GET /api/sources?type=tv&tmdbId=&title=&year=&season=&episode=`
  → `{sources:[{provider:"up_vidrock",url:"https://api.dlproxy.com/v1/play/<token>"}]}` (valid HLS once you have the token).
  Subs: `GET /api/subtitles?tmdbId=&season=&episode=&imdbId=` (plain; files are base64-wrapped OpenSubtitles urls).
- **To go direct:** just needs cf_clearance — params already plain.

### vidsrc.cc
- **CF:** yes; times out / 403 from our IP+TLS. Standard `vidsrc.cc/v2/embed/{type}/{id}[/{s}/{e}]` → rcp/prorcp → m3u8. Needs browser/CF-bypass.

### vidsrc.fyi   (worker driver — **Turnstile**)
- cloudnestra rcp + **Cloudflare Turnstile** PoW. Needs patchright **headed** ~ up to 40s.

### SuperEmbed (getsuperembed.link → streamingnow.mov)   (worker driver)
- `GET https://getsuperembed.link/?video_id={id}&tmdb=1&player_loader=3&preferred_server=0[&season=&episode=]` → returns a target url → Turnstile + ad-walls. Headed patchright.

### 2Embed (www.2embed.cc/embed/{id}[&s=&e=])   (worker driver)
- Server-picker shell → backends (vidsrc/streamsb-style), several themselves CF-fronted. Indirect; browser.

### vidsrc.to  → vsembed.ru
- Just iframes `vsembed.ru` behind a CF challenge. Indirect.

### nepu.to
- **CF: hard** managed challenge — headless can't even pass (PAT 401). Unreachable without real cf_clearance / FlareSolverr. Source flow never observable.

### SmashyStream (player.smashy.stream/{movie|tv}/{tmdb}[?s=&e=])  — INVESTIGATED, no link yet
- Found on 456movie's **TV** dropdown 2026-06-30. Well-known multi-source aggregator.
- **2026-06-30 link check:** `curl` → `code=000` (browser-only). Direct top-level load also fails
  under a real browser (`ERR_HTTP_RESPONSE_CODE_FAILURE` — must be framed by 456movie). Retested with
  the worker's **patchright headed** path, in-context (framed by 456movie), 45–55s poke: **no m3u8/mp4**
  captured. **No proxiable link obtained** (the stream proxy can't help — there's nothing to proxy yet).
  TODO: deeper recon of its `/sources` endpoint (sub-sources like `ffix`/`nflim`) + crackability.

### vidsrc.icu (vidsrc.icu/embed/{movie|tv}/{tmdb}[/{s}/{e}])  — UNREACHABLE from our box
- Found on 456movie's **TV** dropdown 2026-06-30. A vidsrc-clone embed.
- **2026-06-30 link check:** `vidsrc.icu` **does not resolve** from this host (DNS `NO RESOLVE` —
  AdGuard-blocked or dead). Couldn't fetch anything. Re-check from an unfiltered network before
  spending time; may be dead.

### nontongo.win (www.nontongo.win/embed/{movie|tv}/{tmdb}[/{s}/{e}])  — INVESTIGATED, multi-hop, no link yet
- Found on 456movie's **TV** dropdown 2026-06-30. Reachable (200). Resolution chain mapped:
  `…/embed/tv/{id}/{s}/{e}` (12KB stub, click→injects iframe) →
  `…/embed/tv/tv_nontongo-trace.php?id=&s=&e=` (server picker: **Asia/Bravo/Indigo/Nontongo/Whisky**) →
  `…/embed/tv/getPlayTV-trace.php?id=&s=&e=&sv=<server>` → JS `window.location` redirect to
  `https://boo.nontongo.win/embed/<XOR-obfuscated token>` → **Cloudflare-challenged** player (+ heavy
  popunder ad scripts). Retested with the worker's **patchright headed** path, BOTH direct and
  in-context, 45–55s poke: **no m3u8** captured (final hop CF-gated/ad-walled under automation).
  **No proxiable link obtained** (nothing for the stream proxy to consume yet). TODO: resolve the
  `boo.nontongo.win` token + CF.

> **Bottom line for the 3 TV-only providers (checked 2026-06-30): none yield a link — even with a real browser.**
> Retested with the worker's full **patchright headed** path (the same engine that cracks Turnstile
> providers), BOTH direct and in-context (framed by 456movie), 45–55s poking each:
> - **SmashyStream** — blocks direct top-level load (`ERR_HTTP_RESPONSE_CODE_FAILURE`); in-context it
>   loaded but exposed **no m3u8/mp4** to the sniff.
> - **Nontongo** — loads, but its `boo.nontongo.win/<token>` final hop is CF-challenged + ad-walled;
>   **no stream** captured direct or in-context.
> - **vidsrc.icu** — DNS doesn't resolve here; untestable.
> So the **stream proxy can't help** — it only proxies a URL *after* a resolver produces one, and the
> browser resolver produces nothing for these. Each would need a bespoke click-through driver and
> still faces CF/ad walls. **Low ROI** — we already have strong TV coverage (cinezo + vidlink direct,
> videasy browser). Park unless we specifically want breadth.

---

## 🧰 Aggregators (no video of their own; emit a list of the above)

### hydrahd.ru
- `GET https://hydrahd.ru/ajax/tv_0.php?i={imdb}&t={tmdb}&s={s}&e={e}` (PLAIN, no auth) →
  HTML with an iframe + server list pointing at third-party embeds: **airflix1.com** (default),
  vidfast.pro, vidrock, vidking.net, videasy.net, 2embed.cc, moviesapi.to, autoembed.cc,
  peachify.top, primesrc.me, xpass.top, …
- Self = trivial scrape; the real resolution is whichever downstream embed you pick.

### 456movie.nl   (React/shadcn shell; surveyed 2026-06-30)
- A thin aggregator — a Radix `<Select>` swaps a single `<iframe src>`; it hosts no video and
  makes no resolution call of its own. The dropdown maps directly to embed hosts:

  | Dropdown label | iframe host | Backend → our coverage |
  |---|---|---|
  | `111movies: Fastest` | 111movies.net | nexlunar99.site — **browser-only** (deep wall) |
  | `cinezo: Fast` | player.cinezo.live | momlover.notyourtype.dad → storrrrrrm.site — **✅ cinezo-direct** |
  | `vidcore: Fast` | vidcore.net | (own) — not yet looked at |
  | `vidfast: Fast` | vidfast.pro | (own) — not yet looked at |
  | `vidking: Fast` | vidking.net | **videasy** stack (yoru.shegu.org) |
  | `vidlinkpro: Fast` | vidlink.pro | hakunaymatata mp4 — **✅ vidlink-direct** |
  | `videasy4k: May have 4k` | player.videasy.to | **videasy** native (yoru.shegu.org) |
  | `vidsrccc: Fast` | vidsrc.cc/v3 | **videasy** stack |
  | `vidsrcxyz` | vidsrc.xyz | vidsrc — browser |
  | `embedccMovie` | 2embed.cc | lookmovie2.skin (CF) — worker driver |
- Net new from this site: **cinezo** (cracked) + a clean confirmation that vidking/videasy4k/vidsrccc
  all bottom out at the same **videasy** `yoru.shegu.org` backend (one decrypt = three skins).
- **The TV watch page (`/tv/watch/{tmdb}`) has a DIFFERENT, longer dropdown than movies** (12 vs 10).
  Same core set, but it **drops** `embedccMovie` (2embed) and **adds three we didn't have**:
  | TV-only label | iframe host | Status |
  |---|---|---|
  | `SmashyStream FAST` | player.smashy.stream/tv/{tmdb}?s=&e= | **NEW** — spotted, not investigated |
  | `Vidsrc ICU Casting` | vidsrc.icu/embed/tv/{tmdb}/{s}/{e} | **NEW** — spotted, not investigated |
  | `Nontongo Cast` | www.nontongo.win/embed/tv/{tmdb}/{s}/{e} | **NEW** — spotted, not investigated |
  (Also note: on TV, the `Vidsrc AutoNext` entry maps to **vidsrc.cc/v2**, not videasy.) Always
  survey BOTH a movie and a TV page when cataloguing an aggregator — dropdowns differ by media type.

---

## ☠️ Dead / parked (do not use)
- **embed.su** — domain parked ("for sale").
- **vidsrc.rip** — parked; embed POSTs to `router.parklogic.com` (monetization), no video.

---

## Delegation map (who really serves the bytes)
```
cineby.at        → videasy.to
popcornmovies.io → vidrock (api.dlproxy.com)
spencerdevs.xyz  → 1shows.app (cdn.1shows.app)
hydrahd.ru       → airflix1 / vidfast / vidrock / vidking / videasy / 2embed / moviesapi / …
456movie.nl      → 111movies / cinezo / vidcore / vidfast / vidking+videasy4k+vidsrccc(=videasy) / vidlink / 2embed
cinezo           → storrrrrrm.site  (SAME CDN as vidrock)
vidking/vidsrccc → videasy (yoru.shegu.org)
```
Cracking the few real upstreams (**vidrock/cinezo→storrrrrrm, videasy, 1shows**) covers most front-ends.

## Reusable subtitle APIs (work standalone, plain params)
- vidlink: in the source JSON (`stream.captions`).
- 111movies / wyzie: `https://111movies.net/wyzie?id={tmdb}&season={s}&episode={e}`.
- vidrock: `https://sub.vdrk.site/v2/tv/{tmdb}/{s}/{e}`.
- spencerdevs/1shows: `https://subs.1shows.app/data/subs/tv/{tmdb}/{s}/{e}`.
- popcornmovies: `https://popcornmovies.io/api/subtitles?tmdbId=&season=&episode=&imdbId=` (CF-gated).

## Proxy compatibility (does it play through `app/api/stream/proxy`?)
Verified by replaying the proxy's exact fetch chain (master→variant→segment, forwarding
the resolver's `Referer`/headers on every hop) via `proxy-sim.mjs`:

| Provider | Stream | Segment host | Through proxy |
|---|---|---|---|
| vidlink | mp4 (signed) | hakunaymatata.com | ✅ 206 |
| spencerdevs/1shows | hls | p16-…tiktokcdn.com | ✅ master→variant→seg 206 |
| videasy (browser) | hls | yoru.shegu.org (`?q=` tokens) | ✅ master→seg 200 |
| vidrock | hls | p16-sg.tiktokcdn.com | ✅ master→variant→seg 206 |
| cinezo | hls | p16-sg.tiktokcdn.com (via storrrrrrm.site) | ⏳ resolve ✅, proxy not yet replayed |

The proxy re-attaches `Referer` on every hop, so referer-locked HLS and signed MP4 both
work. Any provider we can resolve to `{url, headers}` should play through it — but
**verify per provider** with `node proxy-sim.mjs <resolver> <type> <id> [s] [e]` (some
hosts IP-bind signed URLs or need a segment-specific referer).

## Status of our resolvers
- **vidlink-direct.mjs** — browser-free, working (MP4 + subs).
- **spencerdevs-direct.mjs** — browser-free, working (HLS + ~136 subs), ~900ms. No hardcoded secret.
- **vidrock-direct.mjs** — browser-free, working (HLS + subs; also covers popcornmovies). AES-256-CBC token, key in code.
- **cinezo-direct.mjs** — browser-free, working (HLS + subs; movie + TV verified). AES-256-GCM, key derived from a constant + per-payload salt. Registered in `direct.mjs` (provider name `cinezo`).
- **lib.mjs** (worker) — browser sniff for everything else; optimized to ~3.7s (branch `optimize/extractor-fast-sniff`).
- **Direct cracking: tractable ones DONE** (vidlink, spencerdevs, vidrock, cinezo). Remaining (videasy, 111movies) are deep-obfuscation/anti-tamper walls — keep on the (optimized) browser path. videasy CF is solved (curl_cffi) if we later defeat its anti-tamper decrypt.
