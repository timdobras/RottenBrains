# RottenBrains — feature backlog / parked ideas

Things worth doing later, with enough detail to pick up cold. Not scheduled.

---

## Live TV + Sports (parked 2026-06-30)

Inspired by `1shows.org/livetv` + `/sports`. We reverse-engineered how they do it — both
are pure aggregation of **free public sources**, no custom encoders. Parking for later.

### Live TV — LOW lift, clean win
1shows' `/livetv` is just a country→stream picker over the open-source **iptv-org/iptv** repo:
- countries = `GET https://api.github.com/repos/iptv-org/iptv/contents/streams` (323 `<cc>.m3u`)
- streams = `GET https://raw.githubusercontent.com/iptv-org/iptv/master/streams/<cc>.m3u`
  → M3U of channels, each a **direct public HLS url** (e.g. `https://stream.ecable.tv/afrobeats/index.m3u8`).

**Our version:** consume the cleaner **iptv-org/api** JSON instead of scraping GitHub —
`https://iptv-org.github.io/api/` → `channels.json`, `streams.json`, `countries.json`,
`categories.json`, `logos`, EPG `guides.json`. Build a country/category picker → play `.m3u8`
through our existing `app/api/stream/proxy` (handles CORS/referer; some channels geo/referer-lock).
Pure data wiring, **zero reverse-engineering**. Real work = filtering dead links + a grid UI.
Caveat: random public/FAST channels (not premium), community links rot.

### Sports — easy to LIST, harder to play ad-free
1shows' `/sports` proxies the **streamed.su (Streamed)** API through `db.1shows.org/api/sports/*`
(an Express proxy; host const `C5="db.1shows.org"` in their bundle). 1:1 streamed.su shape:
- `GET {base}/sports` → categories `[{id,name}]`
- `GET {base}/matches/{live|all-today|all}[/popular]` → matches
  `[{id,title,category,date,poster,popular,teams:{home,away:{name,badge}},sources:[{source,id}]}]`
- `GET {base}/stream/{source}/{id}` → `[{id,streamNo,language,hd,viewers,source,embedUrl}]`
  where `embedUrl = https://embed.st/embed/{source}/{id}/{streamNo}`.

They just **iframe `embed.st`** (Streamed's player). `embed.st` is anti-bot: JW Player +
`js/wasm/lock.wasm` gate + `POST embed.st/fetch` for the encrypted source, under heavy ad scripts —
NOT a trivially sniffable m3u8 (videasy-class wall).

**Our options:**
- *Quick parity:* proxy the streamed.su API ourselves + iframe `embed.st`. Fast, but ad-laden /
  not our player (against the ad-free native-player goal).
- *RottenBrains way:* use streamed.su for the **listing** (free JSON today), then crack `embed.st`
  (lock.wasm + `POST /fetch`) to resolve the real m3u8 and play in our hls.js player. Separate job.
- *Caveat:* live sports = most rights-sensitive content + streams die/rotate mid-event. Conscious
  decision before shipping.

Full survey: `1SHOWS_LIVETV_SPORTS.md` (in the scratch `rb-extractor`, 2026-06-30).

| Piece | Their source | Our lift |
|---|---|---|
| Live TV | iptv-org public M3U | Low — iptv-org/api JSON → our HLS proxy |
| Sports listing | streamed.su API | Low — proxy the same free API |
| Sports playback | iframe embed.st (wasm-locked) | Med/High — iframe (ads) now, or crack embed.st |
