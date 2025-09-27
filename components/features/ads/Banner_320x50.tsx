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
  adConfig?: AdConfig;
};

const Banner_320x50: React.FC<AdComponentProps> = ({
  adConfig = {
    key: "1c236cabb3ebbc30d25e05756a97c1ab",
    format: "iframe",
    height: 50,
    width: 320,
    params: {},
  },
}) => {
  const [adBlocked, setAdBlocked] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    let scriptLoaded = false;

    const timeoutId = setTimeout(() => {
      if (!scriptLoaded) setAdBlocked(true);
    }, 3000);

    const atScript = document.createElement("script");
    atScript.type = "text/javascript";
    atScript.innerHTML = `
      atOptions = {
        'key': '${adConfig.key}',
        'format': '${adConfig.format}',
        'height': ${adConfig.height},
        'width': ${adConfig.width},
        'params': {}
      };
    `;

    const invokeScript = document.createElement("script");
    invokeScript.type = "text/javascript";
    invokeScript.src = `//www.highperformanceformat.com/${adConfig.key}/invoke.js`;

    invokeScript.onload = () => {
      scriptLoaded = true;
      clearTimeout(timeoutId);
    };
    invokeScript.onerror = () => {
      setAdBlocked(true);
      clearTimeout(timeoutId);
    };

    const adContainer = document.getElementById(`ad-container-banner`);
    if (adContainer) {
      adContainer.appendChild(atScript);
      adContainer.appendChild(invokeScript);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [adConfig]);

  if (user?.premium) return null;

  if (adBlocked) {
    return (
      <div className="flex flex-col items-center justify-center gap-6">
        <div className="flex h-[50px] w-[300px] items-center justify-center border-[4px] border-foreground/60 p-4 text-center font-medium text-foreground">
          Ads help keep Rotten-Brains free. Please disable your ad blocker.
        </div>
      </div>
    );
  }

  return (
    <div
      id="ad-container-banner"
      className="h-[50px] w-[300px] overflow-hidden bg-foreground/10"
    />
  );
};

export default Banner_320x50;
