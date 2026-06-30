'use client';

import Hls from 'hls.js';
import { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

export interface NativeSubtitle {
  label: string;
  lang?: string;
  src: string;
  default?: boolean;
}

/** Live playback diagnostics, surfaced via `onStats` (for the dev/debug panel). */
export interface NativePlayerStats {
  engine: 'hls.js' | 'native-hls' | 'mp4';
  /** Available HLS quality levels (empty for mp4/native). */
  levels: { height: number; bitrate: number; name?: string }[];
  /** Index into `levels` of the active level, or -1 for auto/unknown. */
  currentLevel: number;
  currentHeight: number | null;
  currentBitrate: number | null;
  videoWidth: number;
  videoHeight: number;
  /** Seconds buffered ahead of the playhead. */
  bufferAhead: number;
  droppedFrames: number;
  /** ms from loadSource to MANIFEST_PARSED (hls.js only). */
  manifestMs: number | null;
  errors: { type: string; details: string; fatal: boolean }[];
}

interface NativePlayerProps {
  /** Proxy-wrapped stream URL (from /api/stream/extract). */
  src: string;
  /** "hls" (m3u8 via hls.js) or "mp4" (progressive, native <video>). */
  streamType?: 'hls' | 'mp4';
  subtitles?: NativeSubtitle[];
  /** Seconds to resume from. */
  startTime?: number;
  /** Fired periodically with (currentSeconds, durationSeconds). */
  onProgress?: (current: number, duration: number) => void;
  /** Fired with live playback diagnostics (qualities, buffer, errors…). */
  onStats?: (stats: NativePlayerStats) => void;
  className?: string;
}

function emptyStats(engine: NativePlayerStats['engine']): NativePlayerStats {
  return {
    engine,
    levels: [],
    currentLevel: -1,
    currentHeight: null,
    currentBitrate: null,
    videoWidth: 0,
    videoHeight: 0,
    bufferAhead: 0,
    droppedFrames: 0,
    manifestMs: null,
    errors: [],
  };
}

/**
 * Ad-free HLS player. Plays a stream that has already been resolved and
 * proxy-wrapped server-side, so there is no third-party page and no ads.
 * Uses hls.js where MSE is available, falls back to native HLS (Safari/iOS).
 */
export default function NativePlayer({
  src,
  streamType = 'hls',
  subtitles = [],
  startTime = 0,
  onProgress,
  onStats,
  className,
}: NativePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const statsRef = useRef<NativePlayerStats>(emptyStats('hls.js'));

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    let hls: Hls | null = null;

    // Reset diagnostics for this source.
    const emit = () => onStats?.({ ...statsRef.current, levels: [...statsRef.current.levels], errors: [...statsRef.current.errors] });

    const seekToStart = () => {
      if (startTime > 0 && Number.isFinite(startTime)) {
        try {
          video.currentTime = startTime;
        } catch {
          /* metadata not ready yet; ignore */
        }
      }
    };

    if (streamType === 'mp4') {
      // Progressive MP4 (e.g. vidlink) — native <video>, no hls.js.
      statsRef.current = emptyStats('mp4');
      emit();
      video.src = src;
      video.addEventListener('loadedmetadata', seekToStart, { once: true });
    } else if (Hls.isSupported()) {
      statsRef.current = emptyStats('hls.js');
      emit();
      hls = new Hls({
        // Our proxy already attaches upstream headers, so default loaders are fine.
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });
      const loadedAt = Date.now();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_evt, data) => {
        statsRef.current.manifestMs = Date.now() - loadedAt;
        statsRef.current.levels = (data.levels ?? []).map((l) => ({
          height: l.height,
          bitrate: l.bitrate,
          name: l.name,
        }));
        emit();
        seekToStart();
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_evt, data) => {
        const lvl = hls?.levels?.[data.level];
        statsRef.current.currentLevel = data.level;
        statsRef.current.currentHeight = lvl?.height ?? null;
        statsRef.current.currentBitrate = lvl?.bitrate ?? null;
        emit();
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        statsRef.current.errors = [
          ...statsRef.current.errors.slice(-19),
          { type: data.type, details: data.details, fatal: !!data.fatal },
        ];
        emit();
        if (data.fatal) {
          logger.error('NativePlayer fatal hls error', data);
          setError(`Playback error: ${data.type} / ${data.details}`);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari / iOS)
      statsRef.current = emptyStats('native-hls');
      emit();
      video.src = src;
      video.addEventListener('loadedmetadata', seekToStart, { once: true });
    } else {
      setError('HLS is not supported in this browser.');
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [src, streamType, startTime, onStats]);

  // Poll dynamic stats (buffer / resolution / dropped frames) ~1s, while onStats is set.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onStats) return;
    const tick = () => {
      const s = statsRef.current;
      s.videoWidth = video.videoWidth || 0;
      s.videoHeight = video.videoHeight || 0;
      // Buffered seconds ahead of the playhead.
      let ahead = 0;
      for (let i = 0; i < video.buffered.length; i++) {
        if (video.currentTime >= video.buffered.start(i) && video.currentTime <= video.buffered.end(i)) {
          ahead = video.buffered.end(i) - video.currentTime;
          break;
        }
      }
      s.bufferAhead = ahead;
      const q = video.getVideoPlaybackQuality?.();
      if (q) s.droppedFrames = q.droppedVideoFrames;
      onStats({ ...s, levels: [...s.levels], errors: [...s.errors] });
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [onStats]);

  // Progress reporting (throttled to ~5s).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onProgress) return;
    let last = 0;
    const onTime = () => {
      const now = video.currentTime;
      if (Math.abs(now - last) >= 5) {
        last = now;
        onProgress(now, video.duration || 0);
      }
    };
    video.addEventListener('timeupdate', onTime);
    return () => video.removeEventListener('timeupdate', onTime);
  }, [onProgress]);

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <video
        ref={videoRef}
        controls
        playsInline
        crossOrigin="anonymous"
        style={{ width: '100%', height: '100%', background: '#000' }}
      >
        {subtitles.map((s, i) => (
          <track
            key={`${s.src}-${i}`}
            kind="subtitles"
            label={s.label}
            srcLang={s.lang ?? 'und'}
            src={s.src}
            default={s.default}
          />
        ))}
      </video>
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            background: 'rgba(0,0,0,0.7)',
            padding: '1rem',
            textAlign: 'center',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
