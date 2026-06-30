'use client';

import { Toast } from '@base-ui/react/toast';
import type { ToastVariant } from '@/components/ui/toast';

/**
 * Standalone Base UI toast manager. Shared by reference between the `toast()`
 * helper (callable from anywhere, including outside React) and the `<Toaster />`
 * provider that renders the toasts. Keeps the original shadcn `useToast()` /
 * `toast()` API so existing callers don't change.
 */
export const toastManager = Toast.createToastManager();

/** Custom data carried on each toast (drives variant styling). */
export type ToastData = { variant?: ToastVariant };

export type ToastInput = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss timeout in ms. Falls back to the provider default. */
  duration?: number;
};

export function toast({ title, description, variant, duration }: ToastInput) {
  const id = toastManager.add<ToastData>({
    title,
    description,
    timeout: duration,
    data: { variant },
  });

  return {
    id,
    dismiss: () => toastManager.close(id),
    update: (props: ToastInput) =>
      toastManager.update<ToastData>(id, {
        title: props.title,
        description: props.description,
        data: { variant: props.variant },
      }),
  };
}

export function useToast() {
  return {
    toast,
    dismiss: (toastId?: string) => toastManager.close(toastId),
  };
}
