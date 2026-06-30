'use client';

import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Visual variants for a toast. Shared by the Base UI-backed `Toaster`.
 * Enter/exit animation uses Base UI's `data-[starting-style]` /
 * `data-[ending-style]` attributes (replaces tailwindcss-animate).
 */
export const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all duration-200 data-[starting-style]:translate-x-full data-[starting-style]:opacity-0 data-[ending-style]:translate-x-full data-[ending-style]:opacity-0',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        destructive:
          'destructive group border-destructive bg-destructive text-destructive-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export type ToastVariant = NonNullable<VariantProps<typeof toastVariants>['variant']>;
