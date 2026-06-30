'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface MyRedirectModalProps {
  userId: string; // The user ID to redirect to
  isOpen: boolean; // Whether the modal is visible
  children?: React.ReactNode;
}

export default function PostModal({ userId, isOpen, children }: MyRedirectModalProps) {
  const router = useRouter();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Closing this intercepting-route modal navigates back to the profile.
        if (!open) router.replace(`/protected/user/${userId}`);
      }}
    >
      <DialogContent className="relative max-h-[70vh] w-full max-w-[95vw] overflow-hidden rounded-[16px] p-0 md:aspect-[16/9] md:max-h-[90vh] md:w-[60vw]">
        <DialogTitle className="sr-only">Post</DialogTitle>
        <div className="h-full w-full">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
