"use client";

import Modal from "@/components/features/profile/Modal";
import Link from "next/link";
import { useState, useEffect } from "react";

const LegalConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const consent = localStorage.getItem("legalConsent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("legalConsent", "true");
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false); // Simply hide the popup without saving consent
  };

  if (!isVisible) return null;

  return (
    <Modal
      isOpen={isVisible}
      onClose={() => {
        handleDismiss();
      }}
      title={"Legal Notice"}
    >
      <p className="mb-4">
        Data provided by TMDb API.{" "}
        <Link href={"/"} className="text-accent">
          rotten-brains.com
        </Link>{" "}
        doesn’t host movies; we only share links. Our site provides links to
        content hosted by third-party sites, over which we have no control. We
        take intellectual property rights seriously. If you believe a third
        party is infringing on your copyright, please submit a DMCA report to
        rotten-brains-legal@proton.me, and we’ll take appropriate action.
        Premium servers are just a scrape of other servers which are not hosted
        by us. You can find more information in our{" "}
        <Link href={"/legal"} className="text-accent">
          legal page
        </Link>
        .
      </p>

      <button
        onClick={handleAccept}
        className="rounded bg-accent px-4 py-2 text-foreground"
      >
        Accept
      </button>
    </Modal>
  );
};

export default LegalConsent;

// nice
