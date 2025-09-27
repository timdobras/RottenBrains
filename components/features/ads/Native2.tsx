"use client";

import React, { useEffect, useState } from "react";

const Native2 = () => {
  const [adBlocked, setAdBlocked] = useState(false);

  useEffect(() => {
    let scriptLoaded = false;

    // Wait up to 3 seconds for the script to load
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
      "//pl25674844.profitablecpmrate.com/abb2ea7a4d3e44fcab41da307b190d27/invoke.js";

    // Mark the script as loaded if successful
    adScript.onload = () => {
      scriptLoaded = true;
      clearTimeout(timeoutId);
    };

    // Mark the ad as blocked if the script fails to load
    adScript.onerror = () => {
      setAdBlocked(true);
      clearTimeout(timeoutId);
    };

    // Append the script to the document body
    document.body.appendChild(adScript);

    // Cleanup timeout and remove the script on unmount
    return () => {
      clearTimeout(timeoutId);
      if (document.body.contains(adScript)) {
        document.body.removeChild(adScript);
      }
    };
  }, []);

  if (adBlocked) {
    return (
      <div className="flex h-full min-h-32 w-full items-center justify-center bg-red-500 text-white">
        Ad Blocked / Could not display ad
      </div>
    );
  }

  // Render the ad container. The script will inject content here.
  return (
    <div
      id="container-abb2ea7a4d3e44fcab41da307b190d27"
      className="h-full w-full text-sm text-foreground"
    />
  );
};

export default Native2;
