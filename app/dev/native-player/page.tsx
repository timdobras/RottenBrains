'use client';

import { useState } from 'react';
import NativePlayer, { type NativeSubtitle } from '@/components/features/watch/NativePlayer';

/**
 * DEV-ONLY proof-of-concept page for the ad-free native streaming pipeline.
 * Not linked from the app. Two ways to drive it:
 *   1. Paste any public .m3u8 and play it THROUGH our proxy (verifies proxy + player).
 *   2. Enter a TMDB id and hit the resolver chain via /api/stream/extract.
 */

const APPLE_TEST =
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8';

function proxyWrap(url: string): string {
  const h = btoa(JSON.stringify({})); // no special headers for the public test stream
  return `/api/stream/proxy?url=${encodeURIComponent(url)}&h=${h}`;
}

export default function NativePlayerDevPage() {
  const [rawUrl, setRawUrl] = useState(APPLE_TEST);
  const [playSrc, setPlaySrc] = useState<string | null>(null);
  const [subs, setSubs] = useState<NativeSubtitle[]>([]);
  const [status, setStatus] = useState('');

  // Extract-by-TMDB controls
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [mediaId, setMediaId] = useState('27205'); // Inception
  const [season, setSeason] = useState('1');
  const [episode, setEpisode] = useState('1');

  // NOTE: temporarily reachable in production to test the ad-free pipeline.
  // Re-gate or remove this page once the player is wired into the watch UI.

  const playProxied = () => {
    setSubs([]);
    setStatus(`Playing through proxy: ${rawUrl}`);
    setPlaySrc(proxyWrap(rawUrl));
  };

  const runExtract = async () => {
    setStatus('Resolving via /api/stream/extract …');
    setPlaySrc(null);
    setSubs([]);
    const qs = new URLSearchParams({ media_type: mediaType, media_id: mediaId });
    if (mediaType === 'tv') {
      qs.set('season_number', season);
      qs.set('episode_number', episode);
    }
    try {
      const res = await fetch(`/api/stream/extract?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setStatus(`Extract failed (${res.status}): ${data.error ?? 'unknown'}`);
        return;
      }
      setStatus(`Resolved by "${data.resolver}". Playing.`);
      setSubs(data.subtitles ?? []);
      setPlaySrc(data.src);
    } catch (err) {
      setStatus(`Extract error: ${String(err)}`);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, color: 'inherit' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Native player — POC</h1>
      <p style={{ opacity: 0.7, marginBottom: 24, fontSize: 14 }}>
        Ad-free HLS pipeline: resolve → proxy → hls.js. Dev-only.
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontWeight: 600, marginBottom: 8 }}>1. Play any m3u8 through the proxy</h2>
        <input
          value={rawUrl}
          onChange={(e) => setRawUrl(e.target.value)}
          style={{ width: '100%', padding: 8, border: '1px solid #888', borderRadius: 6 }}
        />
        <button
          onClick={playProxied}
          style={{ marginTop: 8, padding: '8px 16px', borderRadius: 6, background: '#34cfeb' }}
        >
          Play via proxy
        </button>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontWeight: 600, marginBottom: 8 }}>2. Resolve a title (TMDB id)</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value as 'movie' | 'tv')}
            style={{ padding: 8, borderRadius: 6, border: '1px solid #888' }}
          >
            <option value="movie">movie</option>
            <option value="tv">tv</option>
          </select>
          <input
            value={mediaId}
            onChange={(e) => setMediaId(e.target.value)}
            placeholder="TMDB id"
            style={{ padding: 8, width: 120, border: '1px solid #888', borderRadius: 6 }}
          />
          {mediaType === 'tv' && (
            <>
              <input
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="S"
                style={{ padding: 8, width: 60, border: '1px solid #888', borderRadius: 6 }}
              />
              <input
                value={episode}
                onChange={(e) => setEpisode(e.target.value)}
                placeholder="E"
                style={{ padding: 8, width: 60, border: '1px solid #888', borderRadius: 6 }}
              />
            </>
          )}
          <button
            onClick={runExtract}
            style={{ padding: '8px 16px', borderRadius: 6, background: '#6900e0', color: '#fff' }}
          >
            Resolve & play
          </button>
        </div>
        <p style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
          Note: provider resolution only works where the server can reach the provider (i.e. the
          deployed Coolify host, not necessarily local dev).
        </p>
      </section>

      {status && (
        <p style={{ fontSize: 13, marginBottom: 12, fontFamily: 'monospace' }}>{status}</p>
      )}

      {playSrc && (
        <div style={{ aspectRatio: '16 / 9', width: '100%', background: '#000' }}>
          <NativePlayer
            src={playSrc}
            subtitles={subs}
            onProgress={(c, d) => setStatus(`t=${c.toFixed(0)}s / ${d.toFixed(0)}s`)}
          />
        </div>
      )}
    </div>
  );
}
