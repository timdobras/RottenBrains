'use client';

import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import type { AnimationPlaybackControls } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * A mobile bottom sheet with a deterministic scroll↔drag handoff.
 *
 * Unlike drawer libraries that let the browser's native scroll compete for the
 * touch (a race that intermittently cancels drag-to-close on real devices), we
 * own the gesture: on each touch we decide scroll vs. drag ourselves and, when
 * dragging, preventDefault() the touchmove so native scroll can never steal it.
 *   - header (handle/title)                          → always drags the sheet
 *   - scroll body, list NOT at top                   → native scroll
 *   - scroll body, list AT top + pull down           → drags the sheet
 *   - scrolling, reach the top and keep pulling down  → hands off to drag
 *   - footer (composer/input)                        → never drags
 *
 * On release, distance OR velocity decides close-vs-settle, with a spring.
 *
 * Keyboard: the sheet frame stays anchored; only the footer lifts above the
 * keyboard (via padding from visualViewport), so typing stays visible without
 * the whole sheet shifting.
 *
 * Touch listeners are attached manually as { passive: false } because React's
 * synthetic onTouchMove is passive — preventDefault() would be a no-op there.
 */

const DRAG_THRESHOLD = 6; // px before we commit to scroll vs drag
const CLOSE_DISTANCE_RATIO = 0.28; // dragged past 28% of height → close
const CLOSE_VELOCITY = 550; // or flicked faster than this (px/s) → close
const OPEN_SPRING = { type: 'spring', stiffness: 480, damping: 46 } as const;

type Mode = 'idle' | 'scroll' | 'drag';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Tailwind height class for the sheet. */
  heightClass?: string;
  /** CSS selector inside the sheet to focus when it opens (e.g. the composer input). */
  autoFocusSelector?: string;
}

export default function BottomSheet({
  open,
  onClose,
  title,
  footer,
  children,
  heightClass = 'h-[85vh]',
  autoFocusSelector,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const y = useMotionValue(0);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const [kb, setKb] = useState(0); // keyboard height (visualViewport)

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const sheetHeight = () => {
    if (sheetRef.current) return sheetRef.current.offsetHeight;
    return typeof window !== 'undefined' ? window.innerHeight * 0.85 : 800;
  };

  const backdropOpacity = useTransform(y, (v) =>
    Math.max(0, 1 - v / sheetHeight())
  );

  const stopAnim = () => {
    anim.current?.stop();
    anim.current = null;
  };

  // Mount on open; play the exit spring before unmounting on close.
  useEffect(() => {
    if (open) {
      setMounted(true);
    } else if (mounted) {
      stopAnim();
      anim.current = animate(y, sheetHeight(), {
        ...OPEN_SPRING,
        onComplete: () => setMounted(false),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Entrance animation + scroll lock + optional autofocus, once mounted.
  useEffect(() => {
    if (!mounted) return;
    y.set(window.innerHeight);
    stopAnim();
    anim.current = animate(y, 0, OPEN_SPRING);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let focusTimer: ReturnType<typeof setTimeout> | undefined;
    if (autoFocusSelector) {
      focusTimer = setTimeout(() => {
        (
          sheetRef.current?.querySelector(autoFocusSelector) as HTMLElement | null
        )?.focus();
      }, 90);
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [mounted, autoFocusSelector, y]);

  // Track keyboard height so the footer can lift above it (frame stays put).
  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || !window.visualViewport)
      return;
    const vv = window.visualViewport;
    const onResize = () =>
      setKb(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    onResize();
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
      setKb(0);
    };
  }, [mounted]);

  // The gesture engine — attached once per open.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!mounted || !sheet) return;

    let mode: Mode = 'idle';
    let startY = 0;
    let dragStartY = 0;
    let lastY = 0;
    let lastT = 0;
    let vel = 0;

    const atTop = () => (scrollRef.current?.scrollTop ?? 0) <= 0;

    const settleOpen = () => {
      stopAnim();
      anim.current = animate(y, 0, { ...OPEN_SPRING, velocity: vel });
    };
    const doClose = () => {
      stopAnim();
      anim.current = animate(y, sheetHeight(), {
        ...OPEN_SPRING,
        velocity: Math.max(vel, 0),
        onComplete: () => onCloseRef.current(),
      });
    };

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      stopAnim();
      startY = t.clientY;
      lastY = t.clientY;
      lastT = e.timeStamp;
      vel = 0;
      mode = 'idle';
    };

    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const cy = t.clientY;
      const dy = cy - startY;
      const inc = cy - lastY;
      const inFooter = !!footerRef.current?.contains(e.target as Node);
      const inScroll = !!scrollRef.current?.contains(e.target as Node);

      if (mode === 'idle') {
        if (Math.abs(dy) < DRAG_THRESHOLD) {
          lastY = cy;
          return;
        }
        if (inFooter || (inScroll && !(atTop() && dy > 0))) {
          mode = 'scroll';
          lastY = cy;
          return;
        }
        mode = 'drag';
        dragStartY = cy;
      } else if (mode === 'scroll') {
        if (inScroll && atTop() && inc > 0) {
          mode = 'drag';
          dragStartY = cy;
        } else {
          lastY = cy;
          return;
        }
      }

      // mode === 'drag'
      if (e.cancelable) e.preventDefault();
      y.set(Math.max(0, cy - dragStartY));
      const dt = e.timeStamp - lastT;
      if (dt > 0) vel = (inc / dt) * 1000;
      lastY = cy;
      lastT = e.timeStamp;
    };

    const onEnd = () => {
      const wasDrag = mode === 'drag';
      mode = 'idle';
      if (!wasDrag) return;
      if (y.get() > sheetHeight() * CLOSE_DISTANCE_RATIO || vel > CLOSE_VELOCITY)
        doClose();
      else settleOpen();
    };

    sheet.addEventListener('touchstart', onStart, { passive: false });
    sheet.addEventListener('touchmove', onMove, { passive: false });
    sheet.addEventListener('touchend', onEnd, { passive: false });
    sheet.addEventListener('touchcancel', onEnd, { passive: false });
    return () => {
      sheet.removeEventListener('touchstart', onStart);
      sheet.removeEventListener('touchmove', onMove);
      sheet.removeEventListener('touchend', onEnd);
      sheet.removeEventListener('touchcancel', onEnd);
    };
  }, [mounted, y]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] md:hidden">
      <motion.div
        className="absolute inset-0 bg-black/50"
        style={{ opacity: backdropOpacity }}
        onClick={onClose}
      />
      <motion.div
        ref={sheetRef}
        // paddingBottom lifts the footer above the keyboard while the frame
        // (height + bottom anchor) stays put; the scroll area shrinks to fit.
        style={{ y, paddingBottom: kb }}
        className={`surface-elevated absolute inset-x-0 bottom-0 flex ${heightClass} flex-col rounded-t-2xl border-t border-border text-foreground shadow-2xl`}
      >
        {/* Header — always a drag handle (touch-none so it never tries to scroll) */}
        <div className="shrink-0 touch-none select-none">
          <div className="flex justify-center pt-2.5">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/40" />
          </div>
          {title != null && (
            <div className="px-4 py-2 text-center text-sm font-semibold">
              {title}
            </div>
          )}
          <div className="h-px w-full bg-foreground/10" />
        </div>

        {/* Scroll body — native vertical scroll, hands off to drag at the top */}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto px-3 py-3"
        >
          {children}
        </div>

        {/* Footer — never drags; the sheet's paddingBottom keeps it above the keyboard */}
        {footer != null && (
          <div
            ref={footerRef}
            className="shrink-0 border-t border-foreground/10 pb-[env(safe-area-inset-bottom)]"
          >
            {footer}
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  );
}
