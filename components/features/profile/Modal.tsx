'use client';

import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showClose={false}
        className="max-h-[80vh] w-full max-w-[95vw] gap-0 overflow-hidden p-0 md:max-h-[50vh] md:max-w-[800px]"
      >
        <div className="flex items-center justify-between border-b border-foreground/20">
          <DialogTitle className="p-4 text-xl font-bold">{title}</DialogTitle>
          <button onClick={onClose} className="p-4 text-xl font-semibold" aria-label="Close">
            &times;
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
