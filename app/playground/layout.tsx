import React from 'react';

/**
 * Playground layout — an isolated sandbox for feeling out native-style
 * gesture/animation patterns. Touches nothing in the real app.
 *
 * On desktop it renders inside a centered "phone frame" so the mobile
 * gestures make sense with a mouse. On an actual phone it goes full-bleed.
 */
export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-neutral-900 md:p-6">
      <div className="relative h-full w-full overflow-hidden bg-background text-foreground md:h-[844px] md:w-[390px] md:rounded-[44px] md:border-[10px] md:border-black md:shadow-2xl">
        {children}
      </div>
    </div>
  );
}
