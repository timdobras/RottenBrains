'use client';

import { useEffect, useState } from 'react';
import CustomPlayer from '@/components/features/watch/CustomPlayer';
import { type ResolveInput } from '@/hooks/useStreamResolver';
import { useProviderProbe } from '@/hooks/useProviderProbe';
import { toAlias } from '@/lib/stream/providerNames';

/**
 * DEV-ONLY harness.
 *   1. Paste any public .m3u8 and play it THROUGH our proxy.
 *   2. Enter TMDB coords → probe every provider in parallel → play the first that
 *      works → switch among the confirmed-available ones inside the player.
 */

const APPLE_TEST =
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8';
const DIRECT_RESOLVERS = ['vidlink.pro', 'spencerdevs', 'vidrock', 'cinezo'];

// A few well-known movies (tmdb id) to pick from at random.
const MOVIES = ['27205', '550', '603', '157336', '155', '680', '496243', '438631', '872585', '238', '299534', '1078605'];

// A few well-known shows (tmdb id + how many seasons) to pick a random episode from.
const TV_SHOWS = [
  { id: '1396', seasons: 5 }, // Breaking Bad
  { id: '1399', seasons: 8 }, // Game of Thrones
  { id: '94997', seasons: 2 }, // House of the Dragon
  { id: '66732', seasons: 4 }, // Stranger Things
  { id: '100088', seasons: 2 }, // The Last of Us
  { id: '2316', seasons: 9 }, // The Office (US)
  { id: '95396', seasons: 2 }, // Severance
  { id: '1416', seasons: 15 }, // Grey's Anatomy
];

function proxyWrap(url: string): string {
  return `/api/stream/proxy?url=${encodeURIComponent(url)}&h=${btoa(JSON.stringify({}))}`;
}

const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const C = {
  panel: { border: '1px solid #2a2f3a', borderRadius: 10, background: '#0f131a', padding: 16, marginBottom: 16 },
  h2: { fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' as const, color: '#8b95a7', marginBottom: 12 },
  label: { color: '#8b95a7', fontSize: 12 },
  val: { fontFamily: mono, fontSize: 12, color: '#e6e9ef', wordBreak: 'break-all' as const },
};
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, padding: '5px 0', borderTop: '1px solid #1b2029' }}>
      <span style={C.label}>{label}</span>
      <span style={C.val}>{children}</span>
    </div>
  );
}
function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'green' | 'blue' | 'red' | 'slate' | 'amber' }) {
  const t = { green: ['#0c2a1c', '#3ddc84'], blue: ['#10243a', '#5bb0ff'], red: ['#2c1417', '#ff6b6b'], amber: ['#2c2410', '#ffcc66'], slate: ['#1b2029', '#aab3c2'] }[tone];
  return <span style={{ background: t[0], color: t[1], fontFamily: mono, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>{children}</span>;
}

export default function NativePlayerDevPage() {
  const [rawUrl, setRawUrl] = useState(APPLE_TEST);
  const [manual, setManual] = useState<{ src: string; type: 'hls' | 'mp4'; subtitles: { label: string; lang?: string; src: string }[] } | null>(null);

  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [mediaId, setMediaId] = useState('27205');
  const [season, setSeason] = useState('1');
  const [episode, setEpisode] = useState('1');
  const [showRaw, setShowRaw] = useState(false);
  // Dev shows real provider names; toggle to preview the made-up names prod uses.
  const [showOriginalNames, setShowOriginalNames] = useState(true);
  const display = (real: string) => (showOriginalNames ? real : toAlias(real));

  const [providerList, setProviderList] = useState<string[]>([]);
  const [activeInput, setActiveInput] = useState<ResolveInput | null>(null);
  const [selected, setSelected] = useState(''); // '' = Auto (first that resolves)

  // discover providers to probe (fast-first order, from the worker)
  useEffect(() => {
    fetch('/api/stream/providers')
      .then((r) => r.json())
      .then((d) => setProviderList(Array.isArray(d.providers) ? d.providers : []))
      .catch(() => {});
  }, []);

  // probe all providers in parallel for the active title
  const { probes, available, first, probing } = useProviderProbe(activeInput, providerList, { enabled: !!activeInput && !manual });

  const playProxied = () => {
    setActiveInput(null);
    setManual({ src: proxyWrap(rawUrl), type: 'hls', subtitles: [] });
  };
  const runResolve = () => {
    setManual(null);
    setSelected('');
    setActiveInput({ mediaType, id: mediaId, season, episode });
  };
  const randomMovie = () => {
    const id = MOVIES[Math.floor(Math.random() * MOVIES.length)];
    setMediaType('movie');
    setMediaId(id);
    setManual(null);
    setSelected('');
    setActiveInput({ mediaType: 'movie', id });
  };
  const randomTv = () => {
    const show = TV_SHOWS[Math.floor(Math.random() * TV_SHOWS.length)];
    const s = String(1 + Math.floor(Math.random() * show.seasons));
    const e = String(1 + Math.floor(Math.random() * 8));
    setMediaType('tv');
    setMediaId(show.id);
    setSeason(s);
    setEpisode(e);
    setManual(null);
    setSelected('');
    setActiveInput({ mediaType: 'tv', id: show.id, season: s, episode: e });
  };

  // currently-playing stream: the user's pick (if available), else the first that resolved.
  const picked = selected ? probes[selected]?.stream : null;
  const resolved = picked || first;
  const playerStream = manual ?? (resolved ? { src: resolved.src, type: resolved.type, subtitles: resolved.subtitles } : null);

  const dbg = resolved?.debug;
  const isDirect = resolved ? DIRECT_RESOLVERS.includes(resolved.resolver) : false;
  const input = { padding: 8, border: '1px solid #2a2f3a', borderRadius: 6, background: '#0b0e13', color: '#e6e9ef', fontFamily: mono, fontSize: 13 };

  const menuProviders = available.map((p) => ({ name: p.provider, label: display(p.provider), type: p.type, subs: p.subtitleCount, langs: p.languages?.length }));

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24, color: '#e6e9ef', background: '#0a0d12', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>Native player — dev harness</h1>
      <p style={{ color: '#8b95a7', marginBottom: 24, fontSize: 13 }}>probe all providers → play first working → switch in the player. Dev-only.</p>

      <section style={C.panel}>
        <div style={C.h2}>1 · Play any m3u8 through the proxy</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={rawUrl} onChange={(e) => setRawUrl(e.target.value)} style={{ ...input, flex: 1 }} />
          <button onClick={playProxied} style={{ ...input, cursor: 'pointer', background: '#10243a', color: '#5bb0ff', fontWeight: 700 }}>Play via proxy</button>
        </div>
      </section>

      <section style={C.panel}>
        <div style={C.h2}>2 · Resolve a title (TMDB id)</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={mediaType} onChange={(e) => setMediaType(e.target.value as 'movie' | 'tv')} style={input}>
            <option value="movie">movie</option>
            <option value="tv">tv</option>
          </select>
          <input value={mediaId} onChange={(e) => setMediaId(e.target.value)} placeholder="TMDB id" style={{ ...input, width: 120 }} />
          {mediaType === 'tv' && (
            <>
              <input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="S" style={{ ...input, width: 56 }} />
              <input value={episode} onChange={(e) => setEpisode(e.target.value)} placeholder="E" style={{ ...input, width: 56 }} />
            </>
          )}
          <button onClick={runResolve} style={{ ...input, cursor: 'pointer', background: '#1c1340', color: '#b794ff', fontWeight: 700 }}>Resolve &amp; play</button>
          <button onClick={randomMovie} title="pick a random movie" style={{ ...input, cursor: 'pointer', background: '#13332a', color: '#5be0a8', fontWeight: 700 }}>🎲 Random movie</button>
          <button onClick={randomTv} title="pick a random show + season + episode" style={{ ...input, cursor: 'pointer', background: '#13332a', color: '#5be0a8', fontWeight: 700 }}>🎲 Random TV episode</button>
          <span style={{ ...C.label, alignSelf: 'center' }}>switch provider in the player ▸ ⚙</span>
          <button
            onClick={() => setShowOriginalNames((v) => !v)}
            title="toggle between real provider names (dev) and the made-up names shown in prod"
            style={{ ...input, cursor: 'pointer', marginLeft: 'auto', background: showOriginalNames ? '#10243a' : '#2c2410', color: showOriginalNames ? '#5bb0ff' : '#ffcc66', fontWeight: 700 }}
          >
            names: {showOriginalNames ? 'real' : 'made-up'}
          </button>
        </div>
        {activeInput && (
          <p style={{ ...C.val, marginTop: 12, color: probing ? '#ffcc66' : available.length ? '#9fe6bf' : '#ff6b6b' }}>
            {available.length} available{probing ? ' · still checking…' : ''}
            {resolved ? ` · playing: ${display(resolved.resolver)}` : probing ? ' · finding a source…' : ' · no source found'}
          </p>
        )}
      </section>

      {resolved && (
        <section style={C.panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={C.h2}>Now playing</span>
            <Badge tone={isDirect ? 'green' : 'blue'}>{display(resolved.resolver)}</Badge>
            <Badge tone="slate">{resolved.type}</Badge>
            <Badge tone={isDirect ? 'green' : 'amber'}>{isDirect ? 'browser-free' : 'browser'}</Badge>
          </div>
          {dbg && (
            <>
              <Row label="server resolve">{dbg.elapsedMs} ms</Row>
              <Row label="upstream host">{dbg.upstreamHost ?? '—'}</Row>
              <Row label="subtitles">{dbg.subtitleCount} track(s){resolved.subtitles.length ? ` — ${[...new Set(resolved.subtitles.map((s) => s.lang || s.label))].slice(0, 8).join(', ')}…` : ''}</Row>
            </>
          )}
          <Row label="all sources">
            {providerList.map((p) => {
              const pr = probes[p];
              const tone = pr?.status === 'available' ? '#3ddc84' : pr?.status === 'unavailable' ? '#5b6473' : '#ffcc66';
              return (
                <span key={p} style={{ color: tone, marginRight: 10 }}>
                  {pr?.status === 'available' ? '✓' : pr?.status === 'unavailable' ? '✕' : '⋯'} {display(p)}
                </span>
              );
            })}
          </Row>
          <div style={{ marginTop: 10 }}>
            <button onClick={() => setShowRaw((v) => !v)} style={{ ...C.label, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>{showRaw ? 'hide' : 'show'} raw JSON</button>
            {showRaw && <pre style={{ ...C.val, background: '#0b0e13', padding: 12, borderRadius: 6, marginTop: 8, overflowX: 'auto', maxHeight: 240 }}>{JSON.stringify(resolved, null, 2)}</pre>}
          </div>
        </section>
      )}

      {playerStream && (
        <div style={{ aspectRatio: '16 / 9', width: '100%', borderRadius: 10, overflow: 'hidden', border: '1px solid #2a2f3a' }}>
          <CustomPlayer
            // identity = the title (NOT the provider): switching provider keeps
            // the same instance so it resumes from the last spot; a new title
            // remounts fresh from the start.
            key={manual ? 'manual' : `${mediaType}-${mediaId}-${season}-${episode}`}
            src={playerStream.src}
            type={playerStream.type}
            subtitles={playerStream.subtitles}
            autoPlay
            {...(!manual && {
              providers: menuProviders,
              currentProvider: selected,
              onSelectProvider: setSelected,
              probing,
            })}
          />
        </div>
      )}
    </div>
  );
}
