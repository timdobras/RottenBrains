'use client';

import Hls from 'hls.js';
import {
  Captions,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  Settings,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface CustomPlayerSubtitle {
  label: string;
  lang?: string;
  src: string;
  default?: boolean;
}

interface QualityLevel {
  height: number;
  bitrate: number;
}

interface CustomPlayerProps {
  /** Proxy-wrapped stream URL (from useStreamResolver / /api/stream/extract). */
  src: string;
  type?: 'hls' | 'mp4';
  subtitles?: CustomPlayerSubtitle[];
  startTime?: number;
  autoPlay?: boolean;
  className?: string;
  /** Provider switcher (optional). Selecting one calls onSelectProvider; the
   *  parent re-resolves and feeds back a new `src`. '' = Auto. Only
   *  confirmed-available providers should be passed (with their metadata). */
  providers?: { name: string; label?: string; type?: 'hls' | 'mp4'; subs?: number; langs?: number }[];
  currentProvider?: string;
  onSelectProvider?: (provider: string) => void;
  /** Show a "switching…" overlay while the parent is re-resolving. */
  resolving?: boolean;
  /** Still discovering providers — shows a "checking…" line in the menu. */
  probing?: boolean;
  /** Progress callback for watch-history tracking. Fired on timeupdate, pause,
   *  and end. The parent throttles/persists — we just emit raw state. */
  onProgress?: (s: { currentTime: number; duration: number; paused: boolean; ended: boolean }) => void;
  /** Compact presentation for the floating miniplayer (slim controls). The
   *  underlying <video>/hls instance is identical, so one instance serves both. */
  mini?: boolean;
}

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) return '0:00';
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Minimal custom video player on <video> + hls.js. Our own controls overlay:
 * play/seek/volume/quality/speed/subtitles/PiP/fullscreen + keyboard shortcuts.
 * Intentionally simple — grow it as the app needs more.
 */
export default function CustomPlayer({
  src,
  type = 'hls',
  subtitles = [],
  startTime = 0,
  autoPlay = false,
  className = '',
  providers,
  currentProvider = '',
  onSelectProvider,
  resolving = false,
  probing = false,
  onProgress,
  mini = false,
}: CustomPlayerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  // keep the latest onProgress in a ref so the media-events effect stays []-dep
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [level, setLevel] = useState(-1); // -1 = auto
  const [subIdx, setSubIdx] = useState(-1); // -1 = off
  const [cueText, setCueText] = useState(''); // active caption text (we render it ourselves)
  const [capPx, setCapPx] = useState(20); // caption font size, scaled to the player height
  const [fs, setFs] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subsOpen, setSubsOpen] = useState(false);
  const [show, setShow] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // last known playback position — used to resume after a src/provider switch
  const lastTimeRef = useRef(0);
  // startTime in a ref: it's only an initial-resume hint, so a later change
  // (e.g. the resume position re-fetched when a mini player expands back to
  // full) must NOT re-run the engine effect and reload/restart the stream.
  const startTimeRef = useRef(startTime);
  startTimeRef.current = startTime;
  // synchronous drag flag so timeupdate doesn't fight the scrubber mid-drag
  const draggingRef = useRef(false);

  // ---- engine setup ----
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // no source yet (e.g. the shell is still resolving the first Auto stream) —
    // don't tear into hls/<video> with an empty URL; wait for a real src.
    if (!src) return;
    setError(null);
    setLevels([]);
    setLevel(-1);
    let hls: Hls | null = null;

    // resume where we left off after a provider/src switch (backed up ~1s so we
    // don't skip past the moment we were watching); else honour startTime.
    const resumeAt = lastTimeRef.current > 1 ? lastTimeRef.current - 1 : startTimeRef.current;
    const hasResume = resumeAt > 0 && Number.isFinite(resumeAt);

    const onLoaded = () => {
      if (autoPlay) video.play().catch(() => {});
    };

    if (type === 'mp4' || !Hls.isSupported()) {
      video.src = src;
      video.addEventListener(
        'loadedmetadata',
        () => {
          // mp4 is seekable once metadata is in
          if (hasResume) {
            try {
              video.currentTime = resumeAt;
            } catch {
              /* ignore */
            }
          }
          onLoaded();
        },
        { once: true },
      );
    } else {
      // startPosition tells hls.js to begin loading at our resume point — doing
      // this here (vs. setting currentTime at MANIFEST_PARSED, when the media
      // isn't seekable yet and the seek clamps back to 0) makes resume reliable.
      hls = new Hls({
        enableWorker: true,
        backBufferLength: 90,
        startPosition: hasResume ? resumeAt : -1,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        setLevels((data.levels ?? []).map((l) => ({ height: l.height, bitrate: l.bitrate })));
        onLoaded();
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => setLevel(hls!.autoLevelEnabled ? -1 : data.level));
      // fatal errors: a fresh provider's manifest/segment can fail to load on
      // the first try (slow upstream, proxy hop). Retry network/media errors a
      // few times with backoff before giving up — matches hls.js guidance.
      let netRetries = 0;
      let mediaRetries = 0;
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal || !hls) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && netRetries < 3) {
          netRetries++;
          setError(null);
          setTimeout(() => hls?.startLoad(), 500 * netRetries);
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetries < 2) {
          mediaRetries++;
          setError(null);
          hls.recoverMediaError();
        } else {
          setError(`Playback error: ${data.details}`);
        }
      });
    }

    return () => {
      hls?.destroy();
      hlsRef.current = null;
    };
    // NOTE: startTime/autoPlay are intentionally NOT deps — they're read via
    // refs/closure for initial setup only; a later change must not reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, type]);

  // ---- media element events ----
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const emit = (ended = false) =>
      onProgressRef.current?.({
        currentTime: v.currentTime,
        duration: v.duration || 0,
        paused: v.paused,
        ended,
      });
    const onTime = () => {
      lastTimeRef.current = v.currentTime;
      // while dragging/awaiting a seek, the scrubber shows the target, not the
      // (stale) live position — so don't let timeupdate yank it back.
      if (!draggingRef.current) setCurrent(v.currentTime);
      if (v.buffered.length) {
        for (let i = 0; i < v.buffered.length; i++) {
          if (v.currentTime >= v.buffered.start(i) && v.currentTime <= v.buffered.end(i)) {
            setBuffered(v.buffered.end(i));
            break;
          }
        }
      }
      emit();
    };
    const onDur = () => setDuration(v.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      emit();
    };
    const onEnded = () => emit(true);
    const onWaiting = () => setWaiting(true);
    const onPlaying = () => setWaiting(false);
    const onVol = () => {
      setVolume(v.volume);
      setMuted(v.muted);
    };
    // seek has landed (target buffered) — sync the displayed position and clear
    // the "holding at target" flag so the scrubber tracks live playback again.
    const onSeeked = () => {
      setCurrent(v.currentTime);
      setSeeking(false);
    };
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('seeked', onSeeked);
    v.addEventListener('durationchange', onDur);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', onEnded);
    v.addEventListener('waiting', onWaiting);
    v.addEventListener('playing', onPlaying);
    v.addEventListener('canplay', onPlaying);
    v.addEventListener('volumechange', onVol);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('seeked', onSeeked);
      v.removeEventListener('durationchange', onDur);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('ended', onEnded);
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('playing', onPlaying);
      v.removeEventListener('canplay', onPlaying);
      v.removeEventListener('volumechange', onVol);
    };
  }, []);

  // Subtitle activation. We render captions ourselves (so they can sit above the
  // controls), so the active track is set to 'hidden' — the browser still parses
  // cues and fires `cuechange`, but draws nothing — and others to 'disabled'.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tracks = v.textTracks;
    let active: TextTrack | null = null;
    for (let i = 0; i < tracks.length; i++) {
      if (i === subIdx) {
        tracks[i].mode = 'hidden';
        active = tracks[i];
      } else {
        tracks[i].mode = 'disabled';
      }
    }
    setCueText('');
    if (!active) return;
    const onCue = () => {
      const cues = active!.activeCues;
      let txt = '';
      for (let i = 0; cues && i < cues.length; i++) {
        const c = cues[i] as VTTCue;
        txt += (txt ? '\n' : '') + (c.text ?? '');
      }
      // strip VTT inline tags (<i>, <c>, timestamps…) for a clean v1 render
      setCueText(txt.replace(/<[^>]+>/g, ''));
    };
    active.addEventListener('cuechange', onCue);
    onCue();
    return () => active?.removeEventListener('cuechange', onCue);
  }, [subIdx, subtitles.length]);

  // fullscreen sync
  useEffect(() => {
    const onFs = () => setFs(document.fullscreenElement === wrapRef.current);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Scale caption font to the player size (~4.5% of height), so it looks right
  // whether the player is small, large, or fullscreen.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      setCapPx(Math.round(Math.max(13, Math.min(h * 0.045, 44))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- actions ----
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);
  const seek = useCallback((t: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, Math.min(t, v.duration || t));
  }, []);
  const setVol = useCallback((val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = Math.max(0, Math.min(1, val));
    v.muted = val === 0;
  }, []);
  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (v) v.muted = !v.muted;
  }, []);
  const setSpeed = useCallback((r: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = r;
    setRate(r);
  }, []);
  const setQuality = useCallback((idx: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = idx;
    setLevel(idx);
  }, []);
  const toggleFs = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapRef.current?.requestFullscreen().catch(() => {});
  }, []);
  const togglePip = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      /* unsupported */
    }
  }, []);

  // auto-hide controls
  const poke = useCallback(() => {
    setShow(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      // an open menu keeps the controls up (controlsOn includes the menu state),
      // so we don't force it closed here — just stop showing on idle.
      if (videoRef.current && !videoRef.current.paused) setShow(false);
    }, 2800);
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      // the floating miniplayer must not hijack page keystrokes
      if (mini) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k': e.preventDefault(); togglePlay(); break;
        case 'arrowright': seek(v.currentTime + 5); break;
        case 'arrowleft': seek(v.currentTime - 5); break;
        case 'arrowup': e.preventDefault(); setVol(v.volume + 0.1); break;
        case 'arrowdown': e.preventDefault(); setVol(v.volume - 0.1); break;
        case 'f': toggleFs(); break;
        case 'm': toggleMute(); break;
        case 'c': setSubIdx((i) => (i === -1 ? 0 : -1)); break;
        default: return;
      }
      poke();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, seek, setVol, toggleFs, toggleMute, poke, mini]);

  // scrubber: a transparent native <input type=range> overlay handles all
  // drag/click/touch/keyboard reliably; we just draw the track/buffer/handle.
  const [dragging, setDragging] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  // hold the scrubber at the chosen spot while dragging AND until the seek has
  // actually loaded (seeked event) — otherwise it snaps to the old position
  // for a frame and then jumps forward.
  const displayTime = dragging || seeking ? scrubTime : current;

  const pct = duration ? (displayTime / duration) * 100 : 0;
  const bufPct = duration ? (buffered / duration) * 100 : 0;
  const controlsOn = show || !playing || dragging || settingsOpen || subsOpen;
  const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const btn = 'rounded p-1.5 text-white/90 hover:bg-white/15 transition-colors';
  // dark-themed dropdown-menu styling (the menus live over the video)
  const menuCls = 'z-50 max-h-[60vh] w-56 overflow-y-auto border-white/10 bg-black/95 text-white shadow-xl';
  const radioCls =
    'cursor-pointer text-xs text-white/85 focus:bg-white/15 focus:text-white data-[state=checked]:text-red-400';
  const menuLabelCls = 'px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/40';

  return (
    <div
      ref={wrapRef}
      className={`group relative h-full w-full overflow-hidden bg-black ${className}`}
      // Hide the cursor along with the controls during playback; any mousemove
      // calls poke() which shows both again.
      style={{ cursor: controlsOn ? undefined : 'none' }}
      onMouseMove={poke}
      onMouseLeave={() => playing && setShow(false)}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        playsInline
        crossOrigin="anonymous"
        className="h-full w-full bg-black"
        onClick={togglePlay}
        controlsList="nodownload"
      >
        {subtitles.map((s, i) => (
          <track key={`${s.src}-${i}`} kind="subtitles" label={s.label} srcLang={s.lang ?? 'und'} src={s.src} />
        ))}
      </video>

      {/* switching-provider overlay */}
      {resolving && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/65">
          <div className="flex items-center gap-2 text-sm text-white/90">
            <Loader2 className="h-6 w-6 animate-spin" /> {currentProvider ? `switching to ${currentProvider}…` : 'loading…'}
          </div>
        </div>
      )}

      {/* buffering spinner — also while a finished scrub is still loading its
          target (esp. when paused, where there's no 'waiting' event). Hidden
          while `resolving`, which has its own overlay (avoids a double spinner). */}
      {(waiting || (seeking && !dragging)) && !error && !resolving && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 className="h-10 w-10 animate-spin text-white/80" />
        </div>
      )}

      {/* error */}
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-black/70 p-4 text-center text-sm text-white">
          {error}
        </div>
      )}

      {/* captions — rendered by us so they can sit above the controls when shown */}
      {cueText && (
        <div
          className="pointer-events-none absolute inset-x-0 flex justify-center px-[5%] transition-[bottom] duration-200 ease-out"
          style={{ bottom: controlsOn ? '4.5rem' : '1.25rem' }}
        >
          <span
            className="whitespace-pre-line rounded bg-black/70 px-2 py-0.5 text-center leading-snug text-white"
            style={{ fontSize: `${capPx}px`, textShadow: '0 1px 2px rgba(0,0,0,.9)' }}
          >
            {cueText}
          </span>
        </div>
      )}

      {/* controls */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-10 transition-opacity duration-200 ${
          controlsOn ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* scrubber — visual track + a transparent native range input on top */}
        <div className="group/bar relative mb-1.5 flex h-3.5 items-center">
          <div className="relative h-1 w-full rounded-full bg-white/25 transition-[height] group-hover/bar:h-1.5">
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${bufPct}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-red-500" style={{ width: `${pct}%` }} />
            {/* draggable handle — always visible */}
            <div
              className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow"
              style={{ left: `${pct}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.5}
            value={displayTime}
            onChange={(e) => {
              const t = Number(e.target.value);
              setScrubTime(t);
              setSeeking(true);
              // While dragging, only move the thumb — do NOT seek on every tick
              // (that fired a seek storm: dozens of hls segment loads through the
              // proxy, thrashing playback). Keyboard/click (no active pointer
              // drag) seek immediately; a pointer drag seeks once on release.
              if (!draggingRef.current) seek(t);
            }}
            onPointerDown={() => {
              draggingRef.current = true;
              setDragging(true);
              setShow(true);
            }}
            onPointerUp={(e) => {
              // commit the single seek to the final dragged position
              seek(Number(e.currentTarget.value));
              draggingRef.current = false;
              setDragging(false);
              // hand focus back to the player so space / c / f keybinds keep
              // working — a focused range input otherwise swallows them.
              e.currentTarget.blur();
              // keep showing the target until 'seeked' fires (handled above)
            }}
            onPointerCancel={(e) => {
              // interrupted drag: still commit the seek so it doesn't get stuck
              if (draggingRef.current) seek(Number(e.currentTarget.value));
              draggingRef.current = false;
              setDragging(false);
            }}
            onKeyDown={() => setShow(true)}
            aria-label="seek"
            className="absolute inset-0 m-0 h-full w-full cursor-pointer bg-transparent opacity-0"
          />
        </div>

        {/* button row */}
        <div className="flex items-center gap-1 text-white">
          <button className={btn} onClick={togglePlay} aria-label="play/pause">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>

          {!mini && (
            <>
          <div className="group/vol flex items-center">
            <button className={btn} onClick={toggleMute} aria-label="mute">
              <VolIcon className="h-5 w-5" />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => setVol(Number(e.target.value))}
              className="h-1 w-0 cursor-pointer accent-red-500 opacity-0 transition-all group-hover/vol:w-16 group-hover/vol:opacity-100"
              aria-label="volume"
            />
          </div>

          <span className="px-1 text-xs tabular-nums text-white/85">
            {fmt(displayTime)} <span className="text-white/40">/ {fmt(duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-1">
            {subtitles.length > 0 && (
              <DropdownMenu open={subsOpen} onOpenChange={(o) => { setSubsOpen(o); poke(); }}>
                <DropdownMenuTrigger asChild>
                  <button className={`${btn} ${subIdx >= 0 ? 'text-red-400' : ''}`} aria-label="subtitles">
                    <Captions className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent container={wrapRef.current} side="top" align="end" className={menuCls}>
                  <DropdownMenuLabel className={menuLabelCls}>Subtitles</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={String(subIdx)} onValueChange={(v) => setSubIdx(Number(v))}>
                    <DropdownMenuRadioItem value="-1" className={radioCls}>Off</DropdownMenuRadioItem>
                    {subtitles.map((s, i) => (
                      <DropdownMenuRadioItem key={i} value={String(i)} className={radioCls}>
                        <span className="block w-full truncate">{s.label}</span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DropdownMenu open={settingsOpen} onOpenChange={(o) => { setSettingsOpen(o); poke(); }}>
              <DropdownMenuTrigger asChild>
                <button className={btn} aria-label="settings">
                  <Settings className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent container={wrapRef.current} side="top" align="end" className={menuCls}>
                {onSelectProvider && (
                  <>
                    <DropdownMenuLabel className={menuLabelCls}>
                      Provider{probing ? ' · checking…' : ''}
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={currentProvider || ''} onValueChange={(v) => onSelectProvider(v)}>
                      <DropdownMenuRadioItem value="" className={radioCls}>Auto</DropdownMenuRadioItem>
                      {(providers ?? []).map((p) => (
                        <DropdownMenuRadioItem key={p.name} value={p.name} className={radioCls}>
                          <span className="flex w-full items-center justify-between gap-3">
                            <span className="truncate">{p.label ?? p.name}</span>
                            <span className="shrink-0 text-[10px] text-white/45">
                              {p.type}
                              {p.subs ? ` · ${p.langs && p.langs > 1 ? `${p.langs} langs` : `${p.subs} sub`}` : ''}
                            </span>
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    {probing && (!providers || providers.length === 0) && (
                      <div className="px-2 py-1 text-[10px] text-white/40">checking sources…</div>
                    )}
                    <DropdownMenuSeparator className="bg-white/10" />
                  </>
                )}
                <DropdownMenuLabel className={menuLabelCls}>Quality</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={String(level)} onValueChange={(v) => setQuality(Number(v))}>
                  <DropdownMenuRadioItem value="-1" className={radioCls}>Auto</DropdownMenuRadioItem>
                  {levels.map((l, i) => (
                    <DropdownMenuRadioItem key={i} value={String(i)} className={radioCls}>
                      {l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)}k`}
                    </DropdownMenuRadioItem>
                  ))}
                  {levels.length === 0 && <div className="px-2 py-1 text-xs text-white/40">single stream</div>}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuLabel className={menuLabelCls}>Speed</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={String(rate)} onValueChange={(v) => setSpeed(Number(v))}>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                    <DropdownMenuRadioItem key={r} value={String(r)} className={radioCls}>{r}×</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && (
              <button className={btn} onClick={togglePip} aria-label="picture in picture">
                <PictureInPicture2 className="h-5 w-5" />
              </button>
            )}
            <button className={btn} onClick={toggleFs} aria-label="fullscreen">
              {fs ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
