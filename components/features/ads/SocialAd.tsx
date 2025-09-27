"use client";

import React, { useEffect, useState } from "react";

const SocialAd = () => {
  const [isAdBlocked, setIsAdBlocked] = useState(false);

  useEffect(() => {
    // Function to check if the ad is blocked
    const checkAdBlocked = () => {
      const adContainer = document.getElementById("ad-container-b");
      if (adContainer && adContainer.offsetHeight === 0) {
        setIsAdBlocked(true);
      }
    };

    // Inject the script dynamically
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "//pl25670003.profitablecpmrate.com/de/33/f0/de33f03e15b1594d3414a9fac3a707e5.js";

    script.onload = () => {
      // Delay to check after the script is loaded
      setTimeout(checkAdBlocked, 1000);
    };

    // Append the script to the container
    const adContainer = document.getElementById("ad-container-b");
    if (adContainer) {
      adContainer.appendChild(script);
    }

    return () => {
      // Cleanup script on component unmount
      if (adContainer) {
        adContainer.innerHTML = "";
      }
    };
  }, []);

  return (
    <div>
      <div
        id="ad-container-b"
        style={{
          width: "100%",
          textAlign: "center",
          marginTop: "20px",
        }}
      ></div>
    </div>
  );
};

export default SocialAd;
