"use client";
import { useState } from "react";
import Modal from "./ModalTest";

export default function ModalButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenSecond, setIsOpenSecond] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded bg-blue-500 px-4 py-2 text-white"
      >
        Open Modal
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="h-[200vh] w-full">
          <button
            onClick={() => setIsOpenSecond(true)}
            className="rounded bg-blue-500 px-4 py-2 text-white"
          >
            Open Modal
          </button>
          <Modal isOpen={isOpenSecond} onClose={() => setIsOpenSecond(false)}>
            <div className="h-[200vh] w-full bg-red-500"></div>
          </Modal>
          <h2 className="text-xl font-bold">React Portal Modal</h2>
          <p>
            This modal is inside a client component, but the page is still a
            server component!
          </p>
        </div>
      </Modal>
    </>
  );
}
