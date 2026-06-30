'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function SandboxDemo() {
  const [on, setOn] = useState(false);

  return (
    <div className="relative h-full w-full overflow-y-auto px-5 pb-10 pt-[max(3rem,env(safe-area-inset-top))]">
      <Link
        href="/playground/gestures"
        className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur"
      >
        ← back
      </Link>

      <h1 className="text-xl font-bold">Spring sandbox</h1>

      {/* 1. Press feedback */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Press feedback (whileTap)
        </h2>
        <motion.button
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="mt-2 w-full rounded-2xl bg-accent py-4 font-semibold text-white"
        >
          Press me — I dip & spring back
        </motion.button>
        <p className="mt-1 text-xs text-muted-foreground">
          Instant scale-down on touch, spring release. Sub-100ms feedback is half
          of &ldquo;feels native&rdquo;.
        </p>
      </section>

      {/* 2. Fling-anywhere card */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Drag &amp; fling (momentum + snap back)
        </h2>
        <div className="relative mt-2 h-44 rounded-2xl border border-dashed border-border">
          <motion.div
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.6}
            dragTransition={{ bounceStiffness: 400, bounceDamping: 18 }}
            whileTap={{ scale: 1.08 }}
            className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-primary text-2xl text-white shadow-lg active:cursor-grabbing"
          >
            🎬
          </motion.div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Throw it. It rubber-bands at the edges and springs home with whatever
          momentum you gave it.
        </p>
      </section>

      {/* 3. Spring vs CSS transition */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Spring vs. CSS transition
        </h2>
        <button
          onClick={() => setOn((v) => !v)}
          className="mt-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium"
        >
          Toggle both
        </button>

        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">
              Motion spring — interruptible, physical
            </p>
            <div className="h-12 rounded-lg bg-muted/50">
              <motion.div
                animate={{ x: on ? 220 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-white"
              >
                ⚡
              </motion.div>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-muted-foreground">
              CSS ease — fixed duration, &ldquo;locked&rdquo;
            </p>
            <div className="h-12 rounded-lg bg-muted/50">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(${on ? 220 : 0}px)` }}
              >
                🐢
              </div>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Spam the toggle fast: the spring catches its current velocity and
          redirects; the CSS one restarts each time. That redirect is why springs
          read as &ldquo;alive&rdquo;.
        </p>
      </section>
    </div>
  );
}
