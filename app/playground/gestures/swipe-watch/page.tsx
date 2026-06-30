'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  animate,
  type PanInfo,
} from 'framer-motion';

const videos = [
  { title: 'Dune: Part Two', tag: 'Sci-Fi · 2024', from: 'from-amber-700' },
  { title: 'The Batman', tag: 'Action · 2022', from: 'from-slate-700' },
  { title: 'Interstellar', tag: 'Sci-Fi · 2014', from: 'from-indigo-800' },
  { title: 'Sicario', tag: 'Thriller · 2015', from: 'from-orange-800' },
  { title: 'Arrival', tag: 'Sci-Fi · 2016', from: 'from-teal-800' },
];

export default function SwipeWatchDemo() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(390);
  const [index, setIndex] = useState(0);
  const x = useMotionValue(0);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // keep the track aligned when index/width change (e.g. rotation)
  useEffect(() => {
    animate(x, -index * w, { type: 'spring', stiffness: 500, damping: 45 });
  }, [index, w, x]);

  const onPanEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    const swipe = Math.abs(offset.x) > w * 0.25 || Math.abs(velocity.x) > 500;
    let next = index;
    if (swipe) {
      if (offset.x < 0 && index < videos.length - 1) next = index + 1;
      else if (offset.x > 0 && index > 0) next = index - 1;
    }
    setIndex(next);
    animate(x, -next * w, {
      type: 'spring',
      stiffness: 500,
      damping: 45,
      velocity: velocity.x,
    });
  };

  return (
    <div ref={frameRef} className="relative h-full w-full overflow-hidden">
      <Link
        href="/playground/gestures"
        className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur"
      >
        ← back
      </Link>

      {/* dots */}
      <div className="absolute left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex -translate-x-1/2 gap-1.5">
        {videos.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-5 bg-accent' : 'w-1.5 bg-white/40'
            }`}
          />
        ))}
      </div>

      {/* horizontal track: drag to reveal neighbours, snap on release */}
      <motion.div
        className="flex h-full touch-pan-y"
        style={{ x, width: w * videos.length }}
        drag="x"
        dragConstraints={{ left: -(videos.length - 1) * w, right: 0 }}
        dragElastic={0.18}
        onDragEnd={onPanEnd}
      >
        {videos.map((v) => (
          <div
            key={v.title}
            className="h-full shrink-0 overflow-y-auto pb-10"
            style={{ width: w }}
          >
            <div
              className={`aspect-video w-full bg-gradient-to-br ${v.from} via-neutral-900 to-black`}
            >
              <div className="flex h-full items-center justify-center text-5xl opacity-80">
                ▶
              </div>
            </div>
            <div className="px-4">
              <h1 className="mt-3 text-xl font-bold">{v.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{v.tag}</p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Swipe left or right anywhere on the page. The next video peeks in
                as you drag, and a short flick is enough to commit — distance{' '}
                <em>or</em> velocity decides the snap, just like a native pager.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="aspect-video rounded-lg bg-muted"
                    aria-hidden
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
