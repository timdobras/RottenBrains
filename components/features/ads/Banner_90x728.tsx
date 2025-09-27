"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@/hooks/UserContext";

type AdConfig = {
  key: string;
  format: string;
  height: number;
  width: number;
};

type AdComponentProps = {
  adConfig?: AdConfig; // Optional prop if you want a custom config per ad
};

const Banner_90x728: React.FC<AdComponentProps> = ({
  adConfig = {
    key: "ca6212fb19dd3cc2430bb790e077d316",
    format: "iframe",
    height: 90,
    width: 728,
    params: {},
  },
}) => {
  const [adBlocked, setAdBlocked] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    let scriptLoaded = false;

    const timeoutId = setTimeout(() => {
      // If the script hasn't loaded within 3s, assume it's blocked
      if (!scriptLoaded) setAdBlocked(true);
    }, 3000);

    // 1) Create a <script> that sets up atOptions dynamically
    const atScript = document.createElement("script");
    atScript.type = "text/javascript";
    atScript.innerHTML = `
      atOptions = {
        'key' : '${adConfig.key}',
        'format' : '${adConfig.format}',
        'height' : ${adConfig.height},
        'width' : ${adConfig.width},
        'params' : {}
      };
    `;

    // 2) Create a <script> that loads the ad
    const invokeScript = document.createElement("script");
    invokeScript.type = "text/javascript";
    invokeScript.src =
      "//www.highperformanceformat.com/" + adConfig.key + "/invoke.js";

    invokeScript.onload = () => {
      scriptLoaded = true;
      clearTimeout(timeoutId);
    };
    invokeScript.onerror = () => {
      setAdBlocked(true);
      clearTimeout(timeoutId);
    };

    // 3) Append scripts to the container
    const adContainer = document.getElementById(`ad-container-90x728`);
    if (adContainer) {
      adContainer.appendChild(atScript);
      adContainer.appendChild(invokeScript);
    }

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
    };
  }, [adConfig]);

  // If user has premium, hide ads
  if (user?.premium) {
    return null;
  }

  // If ad is blocked or could not load, show fallback
  if (adBlocked) {
    return (
      <div className="flex flex-col items-center justify-center gap-6">
        <div className="flex h-[90px] w-[728px] items-center justify-center border-[4px] border-foreground/60 p-4 text-center font-medium text-foreground">
          Ads help keep Rotten-Brains free. Please help support us by disabling
          your ad blocker.
        </div>
        <div className="relative mb-4 h-[4px] w-[728px] bg-foreground/60">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-accent px-4 py-1 text-center font-medium">
            AD
          </div>
        </div>
      </div>
    );
  }

  // Show the unique container for the ad
  return (
    <div
      id={`ad-container-90x728`}
      className="h-[90px] w-[728px] overflow-hidden bg-foreground/10"
    />
  );
};

export default Banner_90x728;
