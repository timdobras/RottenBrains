'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePostLike } from './PostLikeContext';

// Window (ms) during which a second tap counts as a double-tap. The same value is
// how long a lone single click is held before it's replayed, so it must stay snappy.
const DOUBLE_TAP_MS = 260;
// Max distance (px) between the two taps for them to count as one double-tap.
const MAX_TAP_DIST = 48;

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
  rotate: number;
  scale: number;
}

interface PendingClick {
  time: number;
  x: number;
  y: number;
  target: EventTarget | null;
  timer: ReturnType<typeof setTimeout>;
}

// Marks a synthesized "replayed" click so the capture handler lets it through
// untouched instead of intercepting it again.
const BYPASS = '__rbDoubleTapBypass';

/**
 * Instagram-style double-tap-to-like.
 *
 * Wraps a post card and intercepts primary clicks in the capture phase. A single
 * click is held for {@link DOUBLE_TAP_MS} and then replayed verbatim, so links and
 * the modal keep working exactly as before. A second click inside that window is
 * treated as a double-tap: navigation is cancelled, the post is liked (like-only,
 * never unliked) and a heart pops at the tap location with a little random
 * rotation / offset so it never looks identical twice.
 *
 * Falls back to a plain pass-through wrapper when there's no logged-in user.
 */
export default function DoubleTapLike({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const like = usePostLike();
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<PendingClick | null>(null);
  // Timestamp of the last like-tap, so a rapid streak of taps keeps popping hearts
  // instead of the trailing odd tap being mistaken for a navigating single click.
  const lastLikeRef = useRef(0);
  const heartId = useRef(0);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);

  const enabled = !!like;
  const likeOnce = like?.likeOnce;

  const replayClick = useCallback((target: EventTarget | null, x: number, y: number) => {
    if (!target || !(target instanceof Element)) return;
    const ev = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      button: 0,
    });
    (ev as any)[BYPASS] = true;
    target.dispatchEvent(ev);
  }, []);

  const flushPending = useCallback(() => {
    const p = pendingRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendingRef.current = null;
    replayClick(p.target, p.x, p.y);
  }, [replayClick]);

  const spawnHeart = useCallback((clientX: number, clientY: number) => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    // Pseudo-random jitter so repeated taps never look identical. No Math.random
    // dependency on render — derived from an incrementing id + tap coords.
    const seed = (heartId.current * 9301 + Math.floor(clientX) * 49297 + Math.floor(clientY)) % 233280;
    const rnd = seed / 233280; // 0..1
    const id = heartId.current++;
    const heart: FloatingHeart = {
      id,
      x: clientX - rect.left,
      y: clientY - rect.top,
      rotate: (rnd - 0.5) * 50, // -25deg..25deg
      scale: 0.85 + rnd * 0.5, // 0.85..1.35
    };
    setHearts((prev) => [...prev, heart]);
  }, []);

  const onHeartDone = useCallback((id: number) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled) return;

    const handler = (e: MouseEvent) => {
      // Let replayed single-clicks and modified/non-primary clicks through untouched.
      if ((e as any)[BYPASS]) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target;
      if (target instanceof Element) {
        // Don't get in the way of text entry or anything that opts out explicitly.
        if (
          target.closest(
            'input, textarea, select, [contenteditable=""], [contenteditable="true"], [data-no-doubletap]'
          )
        ) {
          return;
        }
      }

      // Hold this click so we can decide single vs. double.
      e.preventDefault();
      e.stopPropagation();

      const now = performance.now();
      const x = e.clientX;
      const y = e.clientY;
      const p = pendingRef.current;

      if (p && now - p.time < DOUBLE_TAP_MS && Math.hypot(x - p.x, y - p.y) < MAX_TAP_DIST) {
        // Second tap → double-tap. Drop the held first tap (no navigation) and like.
        clearTimeout(p.timer);
        pendingRef.current = null;
        lastLikeRef.current = now;
        likeOnce?.();
        spawnHeart(x, y);
        return;
      }

      if (now - lastLikeRef.current < DOUBLE_TAP_MS) {
        // Still mashing right after a like — keep popping hearts, never navigate.
        lastLikeRef.current = now;
        likeOnce?.();
        spawnHeart(x, y);
        return;
      }

      // First tap (or too far / too slow from a previous one): flush any stale
      // pending click, then hold this one and replay it if no partner arrives.
      flushPending();
      const timer = setTimeout(() => {
        pendingRef.current = null;
        replayClick(target, x, y);
      }, DOUBLE_TAP_MS);
      pendingRef.current = { time: now, x, y, target, timer };
    };

    root.addEventListener('click', handler, true);
    return () => {
      root.removeEventListener('click', handler, true);
      const p = pendingRef.current;
      if (p) clearTimeout(p.timer);
      pendingRef.current = null;
    };
  }, [enabled, likeOnce, spawnHeart, flushPending, replayClick]);

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={rootRef} className={className} style={{ position: 'relative' }}>
      {children}
      <div className="dt-heart-layer pointer-events-none absolute inset-0 z-30 overflow-hidden">
        {hearts.map((h) => (
          <span
            key={h.id}
            className="dt-heart"
            style={
              {
                left: h.x,
                top: h.y,
                '--dt-rot': `${h.rotate}deg`,
                '--dt-scale': h.scale,
              } as React.CSSProperties
            }
            onAnimationEnd={() => onHeartDone(h.id)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="96px"
              viewBox="0 -960 960 960"
              width="96px"
              aria-hidden="true"
            >
              <path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}
