'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Drawer } from 'vaul';

const comments = [
  ['cinephile_99', 'The cinematography in this is unreal.'],
  ['mango', 'came back just to rewatch the sandworm scene'],
  ['t_dobras', 'swiping this sheet down to close feels SO good'],
  ['nova', 'Hans Zimmer never misses fr'],
  ['greg', 'who else is here in 2026'],
  ['lin', 'the pacing in part two >>> part one'],
  ['arjun', 'watched 3 times this week, no regrets'],
  ['sam', 'that IMAX 70mm print though 🤌'],
  ['kira', 'spice must flow'],
  ['dev', 'notice it rubber-bands at the top when you keep pulling'],
  ['omar', 'the handle + drag-to-dismiss is all vaul, ~30 lines'],
  ['ria', 'add this to the real comment section pls'],
];

export default function CommentsDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Link
        href="/playground/gestures"
        className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur"
      >
        ← back
      </Link>

      {/* mock watch page */}
      <div className="h-full overflow-y-auto pb-10">
        <div className="aspect-video w-full bg-gradient-to-br from-amber-700 via-neutral-900 to-black">
          <div className="flex h-full items-center justify-center text-5xl opacity-80">
            ▶
          </div>
        </div>
        <div className="px-4">
          <h1 className="mt-3 text-xl font-bold">Dune: Part Two</h1>
          <p className="mt-1 text-sm text-muted-foreground">4.2M views · 2024</p>

          {/* comments preview card → opens the sheet */}
          <button
            onClick={() => setOpen(true)}
            className="mt-4 w-full rounded-xl border border-border bg-card/40 p-3 text-left active:bg-muted"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">Comments</span>
              <span className="text-sm text-muted-foreground">
                {comments.length} ›
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              <div className="h-6 w-6 shrink-0 rounded-full bg-accent/70" />
              <p className="truncate text-sm text-muted-foreground">
                {comments[0][1]}
              </p>
            </div>
          </button>

          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            Tap the card to open the comment sheet, then flick it down (or pull
            past the bottom snap point) to dismiss. Try dragging it up past the
            top — it rubber-bands.
          </p>
        </div>
      </div>

      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[300] bg-black/50" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[300] mx-auto flex h-[80%] max-w-[390px] flex-col rounded-t-2xl border-t border-border bg-background outline-none">
            <div className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/40" />
            <div className="flex items-center justify-between px-4 py-3">
              <Drawer.Title className="font-semibold">
                Comments · {comments.length}
              </Drawer.Title>
              <button
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-[env(safe-area-inset-bottom)]">
              {comments.map(([user, text], i) => (
                <div key={i} className="flex gap-3 py-3">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-accent/60" />
                  <div>
                    <p className="text-xs text-muted-foreground">@{user}</p>
                    <p className="text-sm">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
