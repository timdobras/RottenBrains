'use client';

import { Toast } from '@base-ui/react/toast';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toastVariants } from '@/components/ui/toast';
import { toastManager, type ToastData } from '@/components/ui/use-toast';

function ToastList() {
  const { toasts } = Toast.useToastManager();

  return (
    <>
      {toasts.map((toast) => (
        <Toast.Root
          key={toast.id}
          toast={toast}
          className={cn(toastVariants({ variant: (toast.data as ToastData | undefined)?.variant }))}
        >
          <div className="grid gap-1">
            {toast.title && <Toast.Title className="text-sm font-semibold" />}
            {toast.description && <Toast.Description className="text-sm opacity-90" />}
          </div>
          <Toast.Close
            aria-label="Close"
            className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </Toast.Close>
        </Toast.Root>
      ))}
    </>
  );
}

export function Toaster() {
  return (
    <Toast.Provider toastManager={toastManager} limit={1}>
      <Toast.Portal>
        <Toast.Viewport className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
