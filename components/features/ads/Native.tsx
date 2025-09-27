"use client";

import React, { useEffect, useState } from "react";

const NativeAd = () => {
  const [adBlocked, setAdBlocked] = useState(false);

  useEffect(() => {
    let scriptLoaded = false;

    // We'll wait up to 3 seconds for the script to load.
    const timeoutId = setTimeout(() => {
      if (!scriptLoaded) {
        setAdBlocked(true);
      }
    }, 3000);

    // Create the script element
    const adScript = document.createElement("script");
    adScript.async = true;
    adScript.setAttribute("data-cfasync", "false");
    adScript.src =
      "//pl25669917.profitablecpmrate.com/72f3e6514b457b5ab0dfaeaf7714bd49/invoke.js";

    // Script loaded successfully
    adScript.onload = () => {
      scriptLoaded = true;
      clearTimeout(timeoutId);
    };

    // Script failed to load (likely blocked)
    adScript.onerror = () => {
      setAdBlocked(true);
      clearTimeout(timeoutId);
    };

    // Append script to the document (or to a specific DOM element)
    // Here we append to body so the script can find the container by its ID.
    document.body.appendChild(adScript);

    // Cleanup: remove timeout and script if component unmounts
    return () => {
      clearTimeout(timeoutId);
      // Optional: remove the script to avoid duplicates
      if (document.body.contains(adScript)) {
        document.body.removeChild(adScript);
      }
    };
  }, []);

  // Show fallback if ad is blocked
  if (adBlocked) {
    return (
      <div className="flex flex-col items-center justify-center gap-6">
        <div className="flex aspect-[1/1] w-full items-center justify-center border-[4px] border-foreground/60 p-4 text-center font-medium text-foreground">
          Ads help keep Rotten-Brains free. Please help support us by disabling
          your ad blocker.
        </div>
        <div className="relative mb-4 h-[4px] w-full bg-foreground/60">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-accent px-4 py-1 text-center font-medium">
            AD
          </div>
        </div>
      </div>
    );
  }

  // Show the ad container. The ad script will inject content into this div by ID.
  return (
    <div
      id="container-72f3e6514b457b5ab0dfaeaf7714bd49"
      className="h-full w-full text-sm text-foreground"
    />
  );
};

export default NativeAd;
