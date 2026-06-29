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
  className?: string;
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
  className,
}: NativePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    let hls: Hls | null = null;

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
      video.src = src;
      video.addEventListener('loadedmetadata', seekToStart, { once: true });
    } else if (Hls.isSupported()) {
      hls = new Hls({
        // Our proxy already attaches upstream headers, so default loaders are fine.
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, seekToStart);
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          logger.error('NativePlayer fatal hls error', data);
          setError(`Playback error: ${data.type}`);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari / iOS)
      video.src = src;
      video.addEventListener('loadedmetadata', seekToStart, { once: true });
    } else {
      setError('HLS is not supported in this browser.');
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [src, streamType, startTime]);

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
