"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

interface MyRedirectModalProps {
  userId: string; // The user ID to redirect to
  isOpen: boolean; // Whether the modal is visible
  children?: React.ReactNode;
}
export default function PostModal({
  userId,
  isOpen,
  children,
}: MyRedirectModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleClose = () => {
    router.replace(`/protected/user/${userId}`);
  };
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <dialog
        className="relative max-h-[70vh] w-full max-w-[95vw] overflow-hidden rounded-[16px] bg-background text-foreground shadow-lg md:aspect-[16/9] md:max-h-[90vh] md:w-[60vw]"
        open={isOpen}
      >
        <button
          onClick={handleClose}
          className="absolute right-2 top-2 flex aspect-square h-8 items-center justify-center text-lg font-semibold"
        >
          <p>&times;</p>
        </button>
        <div className="h-full w-full">{children}</div>
      </dialog>
    </div>
  );
}
