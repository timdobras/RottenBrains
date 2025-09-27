import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="max-h-[80vh] w-full max-w-[95vw] overflow-y-auto rounded-lg bg-background shadow-lg drop-shadow-lg md:max-h-[50vh] md:max-w-[800px]">
        <div className="flex items-center justify-between border-b border-foreground/20">
          <h2 className="p-4 text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-4 text-xl font-semibold">
            &times;
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
