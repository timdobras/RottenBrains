"use client";

import { useState } from "react";

const ShareButton: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const sharePage = () => {
    const currentUrl = window.location.href; // Get the current URL

    // Check if Web Share API is supported (mobile devices)
    if (navigator.share) {
      navigator
        .share({
          title: document.title,
          url: currentUrl,
        })
        .then(() => {
          console.log("Successfully shared");
        })
        .catch((error) => {
          console.error("Error sharing:", error);
          alert("Sharing failed. Please try copying the link.");
        });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      // Fallback: copy the URL to the clipboard
      navigator.clipboard
        .writeText(currentUrl)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        })
        .catch((error) => {
          console.error("Failed to copy the link.", error);
          alert("Failed to copy the link. Please copy manually.");
        });
    } else {
      // Fallback if clipboard API is unavailable
      alert(
        "Clipboard API is not available. Please copy the link manually: " +
          currentUrl,
      );
    }
  };

  return (
    <button
      onClick={sharePage}
      className="z-10 flex flex-shrink-0 flex-row items-center gap-2 justify-self-end rounded-full bg-foreground/10 px-4 py-1"
    >
      <img
        src="/assets/icons/share-outline.svg"
        alt="Share"
        width={12}
        height={12}
        className="invert-on-dark"
        loading="lazy"
      />
      <p>Share</p>
    </button>
  );
};

export default ShareButton;
