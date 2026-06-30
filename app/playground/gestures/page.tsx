import Link from 'next/link';

const demos = [
  {
    href: '/playground/gestures/mini-player',
    emoji: '📺',
    title: 'Drag-to-dock mini player',
    desc: 'YouTube-style. Drag the player down to shrink it into a docked mini bar; tap to expand. Follows your finger 1:1, releases with a velocity spring.',
  },
  {
    href: '/playground/gestures/swipe-watch',
    emoji: '↔️',
    title: 'Swipe between watch pages',
    desc: 'Swipe left/right to move to the next/previous video. The neighbouring page peeks in as you drag, and snaps based on distance + fling velocity.',
  },
  {
    href: '/playground/gestures/comments',
    emoji: '💬',
    title: 'Swipe-to-dismiss comments',
    desc: 'A bottom sheet (Vaul) you flick down to close. Snap points, scroll-locking and edge rubber-banding handled for you.',
  },
  {
    href: '/playground/gestures/sandbox',
    emoji: '🎛️',
    title: 'Spring sandbox',
    desc: 'Press feedback, a fling-anywhere draggable card, and spring vs. CSS-transition side-by-side so you can feel the difference.',
  },
];

export default function GesturesHub() {
  return (
    <div className="h-full overflow-y-auto px-5 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="text-2xl font-bold tracking-tight">Gesture playground</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Native-feeling interactions, web underneath. Open on your phone for the
        real feel.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {demos.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="group rounded-2xl border border-border bg-card/40 p-4 transition-colors active:bg-muted"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none">{d.emoji}</span>
              <div>
                <h2 className="font-semibold leading-tight group-active:text-accent">
                  {d.title}
                </h2>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                  {d.desc}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground/70">
        Throwaway sandbox · delete <code>app/playground</code> anytime
      </p>
    </div>
  );
}
